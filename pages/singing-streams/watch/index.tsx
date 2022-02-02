import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md';
import { IconButton } from '../../../components/IconButton/IconButton';
import { Layout } from '../../../components/Layout/Layout';
import { MobilePlayerController } from '../../../components/MobilePlayerController/MobilePlayerController';
import { PlayerController } from '../../../components/PlayerController/PlayerController';
import { Playlist } from '../../../components/Playlist/Playlist';
import { Switch } from '../../../components/Switch/Switch';
import { YTPlayer } from '../../../components/YTPlayer/YTPlayer';
import { useSingingStreamForWatch, useSingingStreamsForSearch } from '../../../hooks/singing-stream';
import { useIsMobile } from '../../../hooks/useIsMobile';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { useYTPlayer } from '../../../hooks/useYTPlayer';
import styles from './index.module.scss';

// Since player.removeEventListener doesn't work, manage state used in onStateChange as local variable.
let isRepeatVariable = false;
let startSeconds = 0;
let endSeconds = 0;

function SingingStreamsWatchPage() {
  const reqIdRef = useRef<number>();
  const router = useRouter();
  const streamId = useMemo(() => {
    if (router.query.v && typeof router.query.v === 'string') {
      return router.query.v;
    }
    return;
  }, [router]);

  const { stream } = useSingingStreamForWatch(streamId);
  const { streams } = useSingingStreamsForSearch();

  const [isPlaying, setPlaying] = useState(false);
  const [isEnded, setEnded] = useState(false);
  const [isPlayedOnce, setPlayedOnce] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMobilePlaylistVisible, setMobilePlaylistVisible] = useState(false);

  const [isAutoPlay, setAutoPlay] = useLocalStorage('isAutoPlay', false);
  const [isMute, setMute] = useLocalStorage('isMute', false);
  const [isRepeat, setRepeat] = useLocalStorage('isRepeat', false);
  const [volume, setVolume] = useLocalStorage('volume', 80);

  const isMobile = useIsMobile();

  const { player, ...ytPlayerProps } = useYTPlayer({
    mountId: 'singing-stream-player',
    controls: false,
    autoplay: true,
    width: '100%',
    height: '100%',
  });

  const onPlay = useCallback(() => {
    if (!player) return;
    player.playVideo();
  }, [player]);

  const onPause = useCallback(() => {
    if (!player) return;
    player.pauseVideo();
  }, [player]);

  const onVolumeChange = useCallback(
    (value) => {
      if (!player) return;
      player.setVolume(value);
      setVolume(value);
    },
    [player, setVolume],
  );

  const onMute = useCallback(
    (mute: boolean) => {
      mute ? player?.mute() : player?.unMute();
      setMute(mute);
    },
    [player, setMute],
  );

  const onSeek = useCallback(
    (time: number) => {
      if (!player || !stream) return;
      player.seekTo(stream.start + time);
    },
    [player, stream],
  );

  const onRepeat = useCallback(
    (repeat) => {
      isRepeatVariable = repeat;
      setRepeat(repeat);
    },
    [setRepeat],
  );

  const toggleAutoPlay = useCallback(
    (isAutoPlay) => {
      setAutoPlay(isAutoPlay);
    },
    [setAutoPlay],
  );

  const onStateChange = useCallback((event: { target: YT.Player; data: number }) => {
    console.log('event.data', event.data);
    // unplayed
    if (event.data === -1) {
      setPlayedOnce(false);
    }

    // ended
    if (event.data === 0) {
      if (isRepeatVariable) {
        event.target.seekTo(startSeconds);
      }
      setEnded(true);
    } else {
      setEnded(false);
    }

    // playing
    if (event.data === 1) {
      const currentTime = event.target.getCurrentTime();
      if (endSeconds < currentTime || currentTime < startSeconds) {
        event.target.seekTo(startSeconds);
      }
      setPlaying(true);
      setPlayedOnce(true);
    } else {
      setPlaying(false);
    }
  }, []);

  const onMobilePlayerVisibleChange = useCallback(() => {
    setMobilePlaylistVisible((visible) => !visible);
  }, []);

  // When isRepeat is changed, the local variable is also changed.
  useEffect(() => {
    isRepeatVariable = isRepeat;
  }, [isRepeat]);

  // When the start and end of the stream are changed, the local variables are also changed.
  useEffect(() => {
    startSeconds = stream?.start ?? 0;
    endSeconds = stream?.end ?? 0;
  }, [stream?.start, stream?.end]);

  // Update current time
  useEffect(() => {
    if (!player || !stream || !isPlaying) return;
    const step = () => {
      const currentTime = player.getCurrentTime();
      setCurrentTime(Math.max(0, currentTime - stream.start));
      reqIdRef.current = requestAnimationFrame(step);
    };
    reqIdRef.current = requestAnimationFrame(step);
    return () => {
      reqIdRef.current && cancelAnimationFrame(reqIdRef.current);
    };
  }, [isPlaying, player, stream]);

  // Change mute status.
  useEffect(() => {
    if (!player) return;
    isMute ? player.mute() : player.unMute();
  }, [isMute, player]);

  // Update volume.
  useEffect(() => {
    if (!player) return;
    player.setVolume(volume);
  }, [player, volume]);

  // Add onStateChange event listener.
  useEffect(() => {
    if (!player) return;
    player.addEventListener('onStateChange', onStateChange);
    return () => {
      player.removeEventListener('onStateChange', onStateChange);
    };
  }, [onStateChange, player]);

  // when stream changes, load the video.
  useEffect(() => {
    if (stream && player) {
      setPlayedOnce(false);
      setMobilePlaylistVisible(false);
      player.loadVideoById({ videoId: stream.video_id, startSeconds: stream.start, endSeconds: stream.end });
    }
  }, [player, stream]);

  // When the video ends, if AutoPlay is true, streams will be played in order.
  useEffect(() => {
    if (!isAutoPlay || !streams || !isEnded || !isPlayedOnce || !streamId || !router.isReady) return;
    const playingStreamIndex = streams.findIndex((stream) => stream.id === streamId);
    const nextStreamId = streams[playingStreamIndex + 1]?.id ?? streams[0]?.id;
    if (nextStreamId) {
      router.push(`/singing-streams/watch?v=${nextStreamId}`);
    }
  }, [isAutoPlay, isEnded, isPlayedOnce, router, streamId, streams]);

  return (
    <Layout className={styles.root} title={stream?.song.title || ''} padding={isMobile ? 'all' : 'horizontal'}>
      <main className={styles.main}>
        <div className={styles.player}>
          <YTPlayer {...ytPlayerProps} hidden={!stream || !player} />
        </div>
        {!isMobile ? (
          !streams ? (
            <div className={styles.sidePanelSkeleton} />
          ) : (
            <div className={styles.sidePanel}>
              <div className={styles.autoPlay}>
                <Switch label="自動再生" checked={isAutoPlay} onChange={toggleAutoPlay} />
              </div>
              <Playlist className={styles.playlist} streams={streams} />
            </div>
          )
        ) : null}
      </main>
      {stream && player ? (
        <motion.div
          className={styles.controller}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ ease: 'circOut', duration: 0.5 }}
        >
          {isMobile ? (
            <MobilePlayerController
              isPlaying={isPlaying}
              isRepeat={isRepeat}
              length={stream.end - stream.start}
              videoId={stream.video_id}
              publishedAt={stream.published_at}
              songTitle={stream.song.title}
              songArtist={stream.song.artist}
              currentTime={currentTime}
              onPlay={onPlay}
              onPause={onPause}
              onRepeat={onRepeat}
              onSeek={onSeek}
            />
          ) : (
            <PlayerController
              isPlaying={isPlaying}
              isRepeat={isRepeat}
              isMute={isMute}
              length={stream.end - stream.start}
              volume={volume}
              videoId={stream.video_id}
              songTitle={stream.song.title}
              songArtist={stream.song.artist}
              publishedAt={stream.published_at}
              currentTime={currentTime}
              onPlay={onPlay}
              onPause={onPause}
              onRepeat={onRepeat}
              onSeek={onSeek}
              onMute={onMute}
              onVolumeChange={onVolumeChange}
            />
          )}
        </motion.div>
      ) : null}
      {isMobile && streams ? (
        <motion.div
          className={styles.mobilePlaylistWrapper}
          animate={isMobilePlaylistVisible ? 'visible' : 'hidden'}
          initial="hidden"
          transition={{ ease: 'circOut' }}
          variants={{
            visible: { y: 0 },
            hidden: { y: 'calc(100% - 48px)' },
          }}
        >
          <IconButton className={styles.mobilePlaylistVisibilityToggle} onClick={onMobilePlayerVisibleChange}>
            {isMobilePlaylistVisible ? <MdKeyboardArrowDown /> : <MdKeyboardArrowUp />}
          </IconButton>
          <Playlist className={styles.mobilePlaylist} streams={streams} />
        </motion.div>
      ) : null}
    </Layout>
  );
}

export default SingingStreamsWatchPage;

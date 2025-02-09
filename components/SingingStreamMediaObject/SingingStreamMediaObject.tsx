import Image from 'next/image';
import Link from 'next/link';
import type { SingingStreamForSearch } from '../../types';
import { KebabMenu } from '../KebabMenu/KebabMenu';
import { format } from 'date-fns';
import styles from './SingingStreamMediaObject.module.scss';
import { memo } from 'react';
import { ExternalLink } from '../ExternalLink/ExternalLink';
import { useIsMobile } from '../../hooks/useIsMobile';

type Props = {
  singingStream: SingingStreamForSearch;
};

export const SingingStreamMediaObject = memo(function SingingStreamMediaObject({ singingStream }: Props) {
  const isMobile = useIsMobile();
  return (
    <article className={styles.root}>
      <Link href={`/singing-streams/watch?v=${singingStream.id}`}>
        <a className={styles.thumbnail}>
          <Image
            src={`https://i.ytimg.com/vi/${singingStream.video_id}/hqdefault.jpg`}
            alt={singingStream.video.title}
            layout="fill"
            objectFit="cover"
          />
        </a>
      </Link>
      <div className={styles.info}>
        <Link href={`/singing-streams/watch?v=${singingStream.id}`}>
          <a>
            <div className={styles.song}>
              <h2 className={styles.songTitle}>{singingStream.song.title}</h2>
              <span className={styles.songArtist}>{singingStream.song.artist}</span>
            </div>
            <span className={styles.videoTitle}>{singingStream.video.title}</span>
          </a>
        </Link>
        <span className={styles.publishedAt}>{format(new Date(singingStream.published_at), 'yyyy/MM/dd')} 配信</span>
      </div>
      <KebabMenu
        buttonClassName={styles.menu}
        placement="bottom-end"
        aria-label="動画メニュー"
        size={isMobile ? 'small' : 'medium'}
      >
        <ExternalLink className={styles.originalLink} href={`${singingStream.video.url}&t=${singingStream.start}`}>
          YouTubeで見る
        </ExternalLink>
      </KebabMenu>
    </article>
  );
});

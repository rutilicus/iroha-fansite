import useSWRImmutable from 'swr/immutable';
import type { SingingStreamForSearch, SingingStreamForWatch, UisetlistApiData } from './../types/index';

const PREFIX = 'get-singing-stream-' as const;
const KEYS = {
  search: `${PREFIX}list`,
  watch: `${PREFIX}watch`,
} as const;

let songData: Array<UisetlistApiData> = [];

export function useSingingStreamsForSearch(keyword: string = '') {
  const { data, error } = useSWRImmutable(`${KEYS.search}-${keyword}`, getForList);
  return {
    streams: data,
    error,
  };
}

export function useSingingStreamForWatch(id: string | undefined) {
  // Do not fetch when id is falsy
  const { data, error } = useSWRImmutable(id ? `${KEYS.watch}-${id}` : null, getForWatch);
  return {
    stream: data,
    error,
  };
}

async function getDataFromApi() {
  const response = await fetch("https://uisetlist.herokuapp.com/api/song", {
    mode: 'cors',
  });
  songData = await response.json();
}

async function getForWatch(key: string) {
  if (!songData?.length) {
    await getDataFromApi();
  }
  const match = new RegExp(`${KEYS.watch}-(.*)`).exec(key);
  if (!match) return null;

  const id = match[1];
  let findData = songData.find(
    (e: UisetlistApiData): boolean => 
      id === e.movie.movieId.concat(e.time.toString())
    );
  if (!findData) {
    return null;
  } else {
    return {
      id: findData.movie.movieId.concat(findData.time.toString()),
      start: findData.time,
      end: findData.endTime,
      video_id: findData.movie.movieId,
      published_at: findData.movie.date,
      song: {
        title: findData.songName,
        artist: findData.artist,
      },
      video: {
        title: findData.movie.name,
        url: "https://www.youtube.com/watch?v=".concat(findData.movie.movieId)
      },      
    };
  }
}

async function getForList(key: string): Promise<SingingStreamForSearch[] | null> {
  if (!songData?.length) {
    await getDataFromApi();
  }
  const match = new RegExp(`${KEYS.search}-(.*)`).exec(key);
  if (!match) return null;

  const keyword = match[1];

  return songData.map(
    (e: UisetlistApiData): SingingStreamForSearch => ({
      id: e.movie.movieId.concat(e.time.toString()),
      start: e.time,
      video_id: e.movie.movieId,
      published_at: e.movie.date,
      song: {
        title: e.songName,
        artist: e.artist,
      },
      video: {
        title: e.movie.name,
        url: "https://www.youtube.com/watch?v=".concat(e.movie.movieId),
      }
    })
  ).filter(
    (e: SingingStreamForSearch): boolean => {
      if (keyword) {
        return RegExp(keyword).test(e.song.title);
      } else {
        return true;
      }
    }
  );
}

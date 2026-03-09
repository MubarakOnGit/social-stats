const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');

const CONFIG = {
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY,
    channelId: process.env.YOUTUBE_CHANNEL_ID
  },
  instagram: {
    username: process.env.INSTAGRAM_USERNAME
  },
  tiktok: {
    username: process.env.TIKTOK_USERNAME
  }
};

async function fetchYouTubeStats() {
  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${CONFIG.youtube.channelId}&key=${CONFIG.youtube.apiKey}`;
    const response = await axios.get(url);
    const stats = response.data.items[0].statistics;
    
    return {
      subscribers: parseInt(stats.subscriberCount),
      views: parseInt(stats.viewCount),
      videos: parseInt(stats.videoCount),
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('YouTube API Error:', error.message);
    return null;
  }
}

async function fetchInstagramStats() {
  try {
    // Method 1: Using scraping API (free tier)
    // Sign up at: https://www.scrapingdog.com/ (1000 free credits)
    const SCRAPING_DOG_API = process.env.SCRAPING_DOG_API; // Optional
    
    if (SCRAPING_DOG_API) {
      const url = `https://api.scrapingdog.com/instagram?username=${CONFIG.instagram.username}&api_key=${SCRAPING_DOG_API}`;
      const response = await axios.get(url);
      return {
        followers: response.data.followers || 0,
        following: response.data.following || 0,
        posts: response.data.posts || 0,
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Method 2: Alternative scraping (may break if Instagram changes)
    const url = `https://www.instagram.com/${CONFIG.instagram.username}/`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // Extract from meta tags or shared data
    const $ = cheerio.load(response.data);
    const metaContent = $('meta[property="og:description"]').attr('content');
    const match = metaContent?.match(/([\d,]+)\s*Followers/);
    
    return {
      followers: match ? parseInt(match[1].replace(/,/g, '')) : 0,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Instagram Error:', error.message);
    return null;
  }
}

async function fetchTikTokStats() {
  try {
    // Using scraping service (free tier available)
    // Alternative: https://github.com/drawrowfly/tiktok-scraper (self-hosted)
    
    const url = `https://www.tiktok.com/@${CONFIG.tiktok.username}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Try to extract from JSON data in script tags
    const scripts = $('script').map((i, el) => $(el).html()).get();
    const dataScript = scripts.find(s => s?.includes('SIGI_STATE'));
    
    if (dataScript) {
      const jsonStr = dataScript.match(/SIGI_STATE\s*=\s*({.+?});/)?.[1];
      if (jsonStr) {
        const data = JSON.parse(jsonStr);
        const user = data.UserModule?.users?.[CONFIG.tiktok.username];
        
        return {
          followers: user?.stats?.followerCount || 0,
          following: user?.stats?.followingCount || 0,
          likes: user?.stats?.heartCount || 0,
          videos: user?.stats?.videoCount || 0,
          lastUpdated: new Date().toISOString()
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('TikTok Error:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Fetching social stats...');
  
  const [youtube, instagram, tiktok] = await Promise.all([
    fetchYouTubeStats(),
    fetchInstagramStats(),
    fetchTikTokStats()
  ]);
  
  const stats = {
    updatedAt: new Date().toISOString(),
    youtube,
    instagram,
    tiktok
  };
  
  // Save to file
  fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
  console.log('✅ Stats saved to stats.json');
  
  // Log summary
  console.log('\n📊 Current Stats:');
  if (youtube) console.log(`YouTube: ${youtube.subscribers.toLocaleString()} subscribers`);
  if (instagram) console.log(`Instagram: ${instagram.followers.toLocaleString()} followers`);
  if (tiktok) console.log(`TikTok: ${tiktok.followers.toLocaleString()} followers`);
}

main().catch(console.error);

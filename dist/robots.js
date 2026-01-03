import { loadConfig } from './config.js';
let robotsInstance = null;
async function getRobotsInstance() {
    if (!robotsInstance) {
        const module = await import('robots-txt-parser');
        const createRobotsParser = module.default || module;
        robotsInstance = createRobotsParser({
            userAgent: '*',
            allowOnNeutral: false
        });
    }
    return robotsInstance;
}
const robotsCache = new Map();
const ROBOTS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
export async function isUrlAllowed(url) {
    const config = loadConfig();
    if (!config.fetch.enableRobotsTxt) {
        return true;
    }
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const cached = robotsCache.get(domain);
        if (cached) {
            const isExpired = Date.now() - cached.timestamp > ROBOTS_CACHE_TTL;
            if (!isExpired) {
                return checkRobots(cached.robots, url);
            }
        }
        const robotsTxt = await fetchRobotsTxt(urlObj.origin);
        if (!robotsTxt) {
            return true;
        }
        const robots = await getRobotsInstance();
        robots.parseRobots(urlObj.origin, robotsTxt);
        robotsCache.set(domain, {
            robots,
            timestamp: Date.now()
        });
        return checkRobots(robots, url);
    }
    catch (error) {
        console.warn(`Failed to check robots.txt for ${url}: ${error.message}`);
        return true;
    }
}
async function fetchRobotsTxt(origin) {
    const config = loadConfig();
    const robotsUrl = `${origin}/robots.txt`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.fetch.timeoutMs);
        const response = await fetch(robotsUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': config.userAgent || 'MCP-SearXNG/1.0'
            }
        });
        clearTimeout(timeoutId);
        if (response.ok) {
            const text = await response.text();
            console.log(`Successfully fetched robots.txt from ${robotsUrl}`);
            return text;
        }
        else {
            console.warn(`Failed to fetch robots.txt from ${robotsUrl}: ${response.status}`);
            return null;
        }
    }
    catch (error) {
        if (error.name === 'AbortError') {
            console.warn(`Timeout while fetching robots.txt from ${origin}`);
        }
        else {
            console.warn(`Error fetching robots.txt from ${origin}: ${error.message}`);
        }
        return null;
    }
}
function checkRobots(robots, url) {
    try {
        const allowed = robots.canCrawlSync(url);
        if (!allowed) {
            console.log(`URL blocked by robots.txt: ${url}`);
        }
        return allowed;
    }
    catch (error) {
        console.warn(`Error checking robots.txt rules: ${error.message}`);
        return true;
    }
}
export function clearRobotsCache() {
    robotsCache.clear();
    console.log('Robots.txt cache cleared');
}

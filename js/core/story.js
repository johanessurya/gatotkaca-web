// Reads story.xml into sections (port of util/StoryLoader.java and Loader.Default).
// A section is Jabang Tetuka when its <player> is "0".
export function parseStory(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const comic = (name) => `images/comic/${name}.jpg`;
    return Array.from(doc.getElementsByTagName('section')).map((sec) => {
        const text = (tag) => Array.from(sec.getElementsByTagName(tag)).map((n) => n.textContent.trim());
        return {
            title: text('title')[0] || '',
            isJT: text('player')[0] === '0',
            opening: text('opening').map(comic),
            maps: text('map'),
            ending: text('ending').map(comic),
        };
    });
}

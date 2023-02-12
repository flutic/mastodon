import { login } from 'masto';
import * as fs from 'fs';

import { installIntoGlobal } from 'iterator-helpers-polyfill';
installIntoGlobal();

const mastodonId = "250835";
const mastodonPosts = JSON.parse(fs.readFileSync("./data/ctd-toots.json", "utf8"));
const mastodonReplies = JSON.parse(fs.readFileSync("./data/ctd-replies.json", "utf8"));

const masto = await login({
  url: "https://mastodon.social",
  accessToken: process.env.TOKEN,
});

// const status = await masto.v1.statuses.create({
//   status: 'Hello from diary.bot - please ignore me',
//   visibility: 'public',
// });

//const result = await masto.v1.accounts.listStatuses(mastodonId, {limit:30});

let idx = 0;

const names = await AsyncIterator.from(masto.v1.accounts.listStatuses(mastodonId), {limit:20})
  .flatten()
  .toArray();


for (const post of names) {
  const foundPost = mastodonPosts.find (p => p.id === post.id);
  if (!foundPost) {
    idx+=1;
    console.log(`found new post ${post.id}`);
    post.contextCheckCount = 0;
    mastodonPosts.push(post);
  } else {
    if (foundPost.favouritesCount !== post.favouritesCount) {
      console.log (`updating favourite count for ${post.id} to ${post.favouritesCount}`);
      foundPost.favouritesCount = post.favouritesCount;
    }

    if (!foundPost.contextCheckCount) {
      foundPost.contextCheckCount = 0;
    }

    if (foundPost.contextCheckCount < 1) {
      const context = await masto.v1.statuses.fetchContext(post.id);
      foundPost.context = context;
      foundPost.contextCheckCount += 1;
      if (foundPost.context.descendants.length > 0) {
        console.log (`existing post ${foundPost.id} has ${foundPost.context.descendants.length} replies`);
        fs.writeFileSync("./data/ctd-toots.json", JSON.stringify(mastodonPosts,null,2));
      }
    }
  }
}
console.log('looking at all posts');

for (const toot of mastodonPosts) {
  if (toot.inReplyToId && toot.inReplyToId !== null) {

    const foundReply = mastodonReplies.find(p => p.id === toot.inReplyToId);
    if (!foundReply) {
      console.log (`     collecting reply ${toot.inReplyToId}`);

      const reply = await masto.v1.statuses.fetch(toot.inReplyToId);
      //console.log(JSON.stringify(reply));
      mastodonReplies.push(reply);
    }
  } else {

    if (!toot.contextCheckCount) {
      toot.contextCheckCount = 0;
    }

    if (!toot.context) {
      const context = await masto.v1.statuses.fetchContext(toot.id);
      toot.context = context;
      if (toot.context.descendants.length > 0) {
        console.log (`toot ${toot.id} has ${toot.context.descendants.length} replies`)
      }
    }

  }
}

fs.writeFileSync("./data/ctd-toots.json", JSON.stringify(mastodonPosts,null,2));
fs.writeFileSync("./data/ctd-replies.json", JSON.stringify(mastodonReplies,null,2));

// const result = await masto.v1.timelines.listHome({
//   limit: 30,
// });
// console.log(result);

// You can also use `for-await-of` syntax to iterate over the timeline
// let i = 0;
// for await (const statuses of masto.v1.timelines.listPublic()) {
//   for (const status of statuses) {
//     await masto.v1.statuses.favourite(status.id);
//     i += 1;
//   }
//   if (i >= 10) break;
// }

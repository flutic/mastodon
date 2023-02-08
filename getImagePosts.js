import * as fs from 'fs';
import { convert } from 'html-to-text';
import fetch from 'node-fetch';

const IGPOSTFILE = "/Users/ctd/projects/ig2020/data/christophertd/posts.json"

const mastodonPosts = JSON.parse(fs.readFileSync("./data/ctd-toots.json", "utf8"));
const existingPosts = JSON.parse(fs.readFileSync(IGPOSTFILE, "utf8"));

const mediaFolder = '/Users/ctd/projects/ig2020/images/christophertd';
let idx = 0;

for (const toot of mastodonPosts) {

  const txt = convert(toot.content, {wordwrap: 512}).replace(/\[.+?\]/g,'').replace(/  /g,' ').replace(/\\n/g,' ');
  const post = {
      "shortCode": "",
      "images": [],
      "caption": txt,
      "comments": [],
      "likes": toot.favouritesCount,
      "timestamp": toot.createdAt,
      "user": "christophertd",
      "source": toot.id
  }

  if (toot.mediaAttachments.length >= 0) {

    if (toot.mediaAttachments.length === 0) {
      post.shortCode = toot.id;
    }

    for (const img of toot.mediaAttachments) {
      if (img.type === "image") {
        const code = img.id;
        //  download image itself
        const fileName = img.url.substring(img.url.lastIndexOf('/') + 1);

        if (post.shortCode.length === 0) {
            post.shortCode = code;
        }
        if (!post.images.includes(code)) {
            post.images.push(code);
        }

        const fname = `${mediaFolder}/${fileName}`;
        post.localPath = fname;

        if (img.description && img.description.length > 0) {
          post.caption += `\n[ALT Text: ${img.description}]`;
        }

        if (!fs.existsSync(fname)) {
          console.log(fname);

          const buf = await download(img.url, fname);
        }

      }
    }
    idx += 1;
    if (toot.context && toot.context.descendants.length > 0) {
      for (const reply of toot.context.descendants) {

        const comment = {
          "text": convert(reply.content, {wordwrap: 512}).replace(/\[.+?\]/g,'').replace(/  /g,' ').replace(/\\n/g,' '),
          "username": reply.account.username,
          "indent": 1
        }
        post.comments.push(comment);

        //console.log(`@${comment.username}: ${comment.text}`)
      }
    }

    if (post.images.length >= 0) {
      const exists = existingPosts.find (p => p.shortCode === post.shortCode);
      if (!exists) {
        if (post.images.length > 0 || (toot.account.username === "CTD" && 
        toot.inReplyToAccountId === null && toot.inReplyToId === null && toot.reblog === null)) {
          existingPosts.push(post);
        }
      } else {
        if (post.localPath) {
          exists.localPath = post.localPath;
        }
        exists.caption = post.caption;
        exists.comments = post.comments;

        if (exists.likes !== toot.favouritesCount) {
          //console.log (`updating favourite count for ${toot.id} to ${toot.favouritesCount}`);
          exists.likes = toot.favouritesCount;
        }
      }
    }
  }
}

fs.writeFileSync(IGPOSTFILE, JSON.stringify(existingPosts,null,2));

async function download(url, fname) {
  const response = await fetch(url);
  const buffer = await response.buffer();

  fs.writeFileSync(fname, buffer);

  return buffer;
}

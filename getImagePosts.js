import * as fs from 'fs';
import { convert } from 'html-to-text';
import fetch from 'node-fetch';

const IGPOSTFILE = "/Users/ctd/projects/ig2020/data/christophertd/posts.json"

const mastodonPosts = JSON.parse(fs.readFileSync("./data/ctd-toots.json", "utf8"));
const existingPosts = JSON.parse(fs.readFileSync(IGPOSTFILE, "utf8"));

const mediaFolder = '/Users/ctd/projects/ig2020/images/christophertd';
let idx = 0;

const newposts = [];

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

  const temp = {
    "id": "109810926906647742",
    "type": "image",
    "url": "https://files.mastodon.social/media_attachments/files/109/810/926/906/647/742/original/95e378212fd54609.jpeg",
    "previewUrl": "https://files.mastodon.social/media_attachments/files/109/810/926/906/647/742/small/95e378212fd54609.jpeg",
    "remoteUrl": null,
    "previewRemoteUrl": null,
    "textUrl": null,
    "meta": {
      "original": {
        "width": 1663,
        "height": 1247,
        "size": "1663x1247",
        "aspect": 1.3336006415396953
      },
      "small": {
        "width": 554,
        "height": 415,
        "size": "554x415",
        "aspect": 1.3349397590361445
      }
    },
    "description": "End game state in Terraforming Mars game with almost no tiles on the map. ",
    "blurhash": "U8F~5II95A%LHXSdDiER?GE4=_NZ0L?G.8%2"
  }

  if (toot.mediaAttachments.length > 0) {
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

      if (toot.context && toot.context.descendants.length > 0) {
        for (const reply of toot.context.descendants) {

          const comment = {
            "text": convert(reply.content, {wordwrap: 512}).replace(/\[.+?\]/g,'').replace(/  /g,' ').replace(/\\n/g,' '),
            "username": reply.account.username,
            "indent": 1
          }
          post.comments.push(comment);

          console.log(`@${comment.username}: ${comment.text}`)
        }
      }

      if (post.images.length > 0) {
        const exists = existingPosts.find (p => p.shortCode === post.shortCode);
        if (!exists) {
          newposts.push (post);
          existingPosts.push(post);
        } else {
          exists.localPath = post.localPath;
          exists.caption = post.caption;
          exists.comments = post.comments;
        }
      }
    }
    idx += 1;
  }
}

//fs.writeFileSync("./newposts.json", JSON.stringify(newposts,null,2));
fs.writeFileSync(IGPOSTFILE, JSON.stringify(existingPosts,null,2));

async function download(url, fname) {
  const response = await fetch(url);
  const buffer = await response.buffer();

  fs.writeFileSync(fname, buffer);

  return buffer;
}

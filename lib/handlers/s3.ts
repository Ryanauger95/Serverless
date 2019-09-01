import { AWS } from "../handlers/aws";

const s3 = new AWS.S3();

const folderName = "user-photos";
enum BUCKETS {
  USER_DOCUMENTS = "holdr-dev-user-photos"
}
enum FOLDERS {
  USER_PROFILE_PIC = "user-profile_pic"
}

/**
 * Uploads a profile picture to an S3 bucket and returns the url
 *
 * @param {number} userId
 * @param {string} base64String
 */
async function uploadProfilePic(userId: number, base64String: string) {
  const filePath = FOLDERS.USER_PROFILE_PIC + "/" + String(userId);
  await s3
    .putObject({
      Bucket: BUCKETS.USER_DOCUMENTS,
      Key: filePath,
      ACL: "public-read",
      Body: base64String
    })
    .promise();

  return s3Url(BUCKETS.USER_DOCUMENTS, filePath);
}

function s3Url(bucket: BUCKETS, filePath: string) {
  return "https://" + bucket + ".s3.amazonaws.com/" + filePath;
}

export { uploadProfilePic };

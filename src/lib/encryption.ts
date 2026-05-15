import Cryptr from "cryptr";

const cryptr = new Cryptr(process.env.ENCRYPTION_KEY || "build_placeholder");

export const encrypt = (text: string) => cryptr.encrypt(text);
export const decrypt = (text: string) => cryptr.decrypt(text);

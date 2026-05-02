"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stitch = stitch;
exports.getDuration = getDuration;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const promises_1 = require("fs/promises");
const os_1 = require("os");
const path_1 = require("path");
if (ffmpeg_static_1.default)
    fluent_ffmpeg_1.default.setFfmpegPath(ffmpeg_static_1.default);
async function stitch(clips, audio, out) {
    const concatList = (0, path_1.join)((0, os_1.tmpdir)(), `concat_${Date.now()}.txt`);
    await (0, promises_1.writeFile)(concatList, clips.map(c => `file '${c}'`).join('\n'));
    return new Promise((resolve, reject) => {
        let cmd = (0, fluent_ffmpeg_1.default)()
            .input(concatList)
            .inputOptions(['-f', 'concat', '-safe', '0']);
        if (audio)
            cmd = cmd.input(audio);
        cmd.outputOptions([
            '-c:v', 'libx264',
            ...(audio ? ['-c:a', 'aac', '-shortest'] : ['-an']),
            '-movflags', '+faststart',
        ])
            .on('end', () => {
            (0, promises_1.unlink)(concatList).catch(() => { });
            resolve();
        })
            .on('error', (err) => {
            (0, promises_1.unlink)(concatList).catch(() => { });
            reject(err);
        })
            .save(out);
    });
}
function getDuration(filepath) {
    return new Promise((resolve, reject) => {
        fluent_ffmpeg_1.default.ffprobe(filepath, (err, data) => {
            if (err)
                reject(err);
            else
                resolve(Math.round(data.format.duration ?? 0));
        });
    });
}

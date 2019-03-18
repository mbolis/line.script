import * as merge from "webpack-merge";
import common from "./webpack.common";
import * as fs from "fs";
import * as webpack from "webpack";
import * as LicenseBannerPlugin from "license-banner-webpack-plugin";

export default merge(common, {
    mode: "production",
    devtool: "source-map",
    optimization: {
        minimize: true
    },
    plugins: [
        new LicenseBannerPlugin(),
        new webpack.BannerPlugin(fs.readFileSync('./LICENSE', 'utf8'))
    ]
});

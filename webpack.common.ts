import * as webpack from "webpack";
import * as path from "path";
import * as TsConfigPathsPlugin from "tsconfig-paths-webpack-plugin";

const config: webpack.Configuration = {
    entry: "./src/index.ts",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            }
        ]
    },
    resolve: {
        extensions: [".ts", ".js", ".css"],
        plugins: [
            new TsConfigPathsPlugin()
        ],
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "app.js"
    }
};
export default config;

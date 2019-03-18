import * as merge from "webpack-merge";
import common from "./webpack.common";

const devConfig = merge(common, {
    devtool: "inline-source-map",
    devServer: {
        contentBase: "."
    }
});
export default devConfig;
// Minimal type declaration for plotly.js-dist-min (UMD browser bundle).
// plotly.js's full types (from @types/plotly.js) describe the API; this
// module re-exports the same surface via `import * as Plotly`.
declare module "plotly.js-dist-min" {
  import * as Plotly from "plotly.js";
  export = Plotly;
}

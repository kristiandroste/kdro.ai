# kdro.ai

The site at kdro.ai: plain HTML, CSS and JavaScript, no frameworks, no build step.

- `index.html`: the home page. `turfusion.html`: the turfusion page.
- `kdro.css`: the styles. `field.js`: the animated field behind every page. `kdro.js`: the strand in the baabaa card
  and the EEG trace in the IntoMind card. `thread.js`: baabaa's thinking-thread engine, used by the strand.
- `img/`: the pictures. `plot-<id>.png` are plots of the Turf collection; `gen-<id>.png` are turfusion's drawings of them.

To look at it: `python3 -m http.server 8000` in this folder, then open http://localhost:8000/.

Publishing is the manual **website** workflow, once GitHub Pages is turned on for the repository.

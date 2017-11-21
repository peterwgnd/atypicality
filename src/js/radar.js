import * as common from './common.js';

let dimens = ['energy', 'acousticness', 'liveness', 'speechiness', 'instrumentalness',
  'valence', 'danceability',
  'tempo',
];

// Mostly copied from Table 1 of ASR paper
// which in turn seem to be copied from API docs here:
//      https://developer.spotify.com/web-api/get-audio-features/
let dimen_descriptions = {
  acousticness: 'The likelihood that this song was recorded solely by acoustic means (as opposed to more electronic means)',
  danceability: 'How suitable is this track for dancing? Includes tempo, regularity of beat, and beat strength',
  energy: 'A perceptual measure of intensity throughout the track. Think fast, loud and noisy (e.g. hard rock) more than dance tracks.',
  instrumentalness: 'The likelihood that this track is predominantly instrumental. Not necessarily the inverse of speechiness.',
  liveness: 'Detects the presence of a live audience during the recording. Heavily studio-produced tracks score low on this measure.',
  speechiness: 'Detects the presence of spoken word throughout the track. Sung vocals are not considered spoken word.',
  tempo: 'The overall average tempo of the track (i.e. bpm)',
  valence: 'The musical positiveness of the track.'
}

let mean_dimens = dimens.map(s => 'mean_'+s);

class RadarChart {

  constructor(root) {
    this.root = root;
    this.cfg = {
      marker_radius: 5,
      base_color: 'cyan',
    }
    let W = this.root.attr('width');
    let H = this.root.attr('height');
    this.origin = {x: W/2, y: H/2};
    let radius = Math.min(W, H) * .45;
    this.scales = dimens.map( (dim, i) => (
      d3.scaleLinear()
      .domain([0,1]) // XXX
      .range([ [this.origin.x, this.origin.y], [
        this.origin.x + radius * (Math.cos(i*2*Math.PI / dimens.length)),
        this.origin.y + radius * (Math.sin(i*2*Math.PI / dimens.length))
      ] ])
    ))

    this.songMap = new Map();
    this.root.append('circle')
    .attr('cx', this.origin.x)
    .attr('cy', this.origin.y)
    .attr('r', this.cfg.marker_radius)
    .attr('fill', 'black');

    let axes = this.root.selectAll('.axis')
    .data(this.scales)
    .enter()
    .append('g')
    .classed('axis', true);
    axes.append('line')
    .attr('x1', scale => scale.range()[0][0])
    .attr('x2', scale => scale.range()[1][0])
    .attr('y1', scale => scale.range()[0][1])
    .attr('y2', scale => scale.range()[1][1])
    .attr('stroke-width', .5)
    .attr('stroke', 'black')
    // labels
    this.axis_labels = axes.append('text')
    .attr('x', scale => scale.range()[1][0])
    .attr('y', scale => scale.range()[1][1])
    // TODO: should just have dimension objs with name, description, scale, etc. etc.
    .datum((s,i) => dimens[i])
    .text(dim => dim)
    .attr('font-size', 12)
    // hover text
    this.axis_labels
    .append('title')
    .text((s,i) => dimen_descriptions[dimens[i]])

  }

  setSonicHighlights(sonics) {
    if (sonics) {
      console.debug(`Setting sonic highlights to ${sonics}`);
    }
    sonics = sonics ? sonics.split(' ') : [];
    this.axis_labels.classed('highlight', dim => sonics.includes(dim));

    this.root.selectAll('.marker')
      .classed('highlight', (pt, i) => {
        let dim = dimens[i];
        return sonics.includes(dim);
      })
  }

  pointsForSong(song) {
    let attrs = song.getAttrs(dimens);
    return attrs.map( (v, i) => this.scales[i](v));
  }

  plotPoints(parent, points, color, kwargs={}, cls='') {
    // TODO: probably nicer to do this styling stuff in css
    // (use focal/contrast/avg classes)
    let g = parent.append('g')
      .classed(cls, true)
      .classed('spiderweb', true);
    g.selectAll('circle').data(points)
    .enter()
    .append('circle')
    .classed('marker', true)
    .attr('r', kwargs.radius == undefined ? this.cfg.marker_radius : kwargs.radius)
    .attr('fill', color)
    .attr('cx', d => d[0])
    .attr('cy', d => d[1])
    .attr('fill-opacity', .5)
    g.append('polygon')
    .attr('points', points.join(','))
    .attr('fill', color)
    return g;
  }

  plotSong(song, main=true) {
    let key = song.dedupe_key;
    if (this.songMap.has(key)) {
      console.warn(`Tried to plot song but key ${key} already present. Ignoring.`);
      return;
    }
    let points = this.pointsForSong(song);
    let g = this.plotPoints(this.root, points, this.cfg.base_color, {}, 
      main ? 'focal' : 'contrast');
    this.songMap.set(key, g);

    if (main) {
      let attrs = song.getAttrs(mean_dimens);
      let mean_points = attrs.map( (v, i) => this.scales[i](v));
      let baseline = this.plotPoints(g, mean_points, '#999', 
        {radius:0},
        'baseline'
      );
    }
    return g;
  }

  clear() {
    for (let song of this.songMap.keys()) {
      this.dropSong(song);
    }
  }

  dropSong(song) {
    let key;
    if (typeof(song) == 'string') {
      key = song;
    } else {
      key = song.dedupe_key;
    }
    let ele = this.songMap.get(key);
    if (ele == undefined) {
      console.warn(`Tried to delete song with key ${key} but wasn't present`);
    }
    ele.remove();
    this.songMap.delete(key);
  }

  contrast(song) {
    // TODO: omg refactor this, this sucks
    let g = this.plotSong(song, false);
    if (g == undefined) {
      return;
    }
    g.selectAll('*')
    .attr('fill', common.contrast_color)
  }

  setSong(song) {
    this.clear();
    if (song) {
      this.plotSong(song);
    }
  }
}

export {RadarChart};

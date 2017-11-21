import {RadarChart} from './radar.js';
import * as common from './common.js';
import * as songdb from './song-db.js';

/* Radar chart for a song plus other stuff like a title and metadata that 
   doesn't work in the radar chart (typicality, year, mode, key...)
*/
class StickySongGraphic {
  constructor (root) {
    this.root = root;
    this.name = root.attr('class');
    // current 'primary' song, if any
    this.song = undefined;
    this.heading = this.root.append('div')
      .classed('heading', true)
      .classed('tk-atlas', true)
      .classed('prose__hed', true)

    //this.heading.append('div').append('mark').classed('year', true)
    this.slider = new YearSlider(this.heading);

    this.heading.append('h3')
      .classed('main', true);

    let chart = this.root.append('div').classed('chart', true);
    this.svg = chart.append('svg')
    .classed('radar', true)
    this.radar = new RadarChart(this.svg, chart);
  }

  setSonicHighlight(sonics) {
    // NB: sonics may be undefined
    this.radar.setSonicHighlights(sonics);
  }

  showAverage(show) {
    // NB: this won't persist through song changes
    this.radar.root.select('.baseline')
      .classed('hidden', !show);
  }

  highlightWeb(cls) {
    this.radar.root.select('.spiderweb.' + cls)
      .classed('highlight', true);
  }
  clearWebHighlights() {
    this.radar.root.selectAll('.spiderweb.highlight')
      .classed('highlight', false);
  }

  setSong(song) {
    if (typeof(song) == 'string') {
      if (this.song && song == this.song.track) {
        return;
      }
      song = songdb.lookup(song);
    }
    if (song == this.song) {
      return;
    }
    this.song = song;
    this.radar.setSong(this.song);
    this.updateHeading();
  }

  transitionSong(song) {
    // TODO
    this.setSong(song);
  }

  setYear(year) {
    //this.heading.select('.year').text(year);
    this.slider.setYear(year);
  }

  updateHeading() {
    let main = (this.song ? 
      `${this.song.artist} - ${this.song.track}`
      : '');
    this.heading.select('.main').text(main);
    if (this.song) {
      this.setYear(this.song.year);
    }
  }

}

class YearSlider {
  constructor(parent) {
    let W = 500;
    let H = 50;
    this.svg = parent.append('svg')
      .attr('viewbox', `0 0 ${W} ${H}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      //.attr('preserveAspectRatio', 'none')
      .classed('year-slider', true);

    this.svg.append('defs').html(
      `<filter x="0" y="0" width="1" height="1" id="highlight">
        <feFlood flood-color="yellow"/>
        <feComposite in="SourceGraphic"/>
      </filter>`)

    let margin = 0;
    this.y = H * 2/3;
    let slider = this.svg.append('g')
    .classed('slider', true)
    //.attr('transform', `translate(${margin}, ${this.y})`)
    
    this.scale = d3.scaleLinear()
      .domain(common.year_range)
      .range([margin, W-margin])

    let track = slider.append('line')
      .classed('track', true)
      .attr('x1', this.scale.range()[0])
      .attr('x2', this.scale.range()[1])
      .attr('y1', this.y)
      .attr('y2', this.y)
      .attr('stroke', '#000')
      .attr('stroke-width', 1)

    //let axis = d3.axisTop(this.scale);
    //slider.call(axis);

    this.marker = this.svg.append('g')
      .classed('marker', true)
      .attr('transform', `translate(0, ${this.y})`)
    this.marker.append('text')
      .classed('year', true)
      .attr('filter', 'url(#highlight)')
      .attr('y', 0)
  }

  setYear(year) {
    let x = this.scale(year);
    this.marker.select('text')
      .attr('x', x)
      .text(year)
  }
}

export {StickySongGraphic};

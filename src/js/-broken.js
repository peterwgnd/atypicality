import {RadarChart} from './radar.js';
import {SongChart} from './song-chart.js';
import {Song} from './song.js';
import {isMobile} from './mobile.js';
import * as common from './common.js';
import * as songdb from './song-db.js';

let min_year = common.year_range[0];
let max_year = common.year_range[1];
let decades = [1950,1960,1970, 1980, 1990, 2000, 2010];

function years_for_decade(decade) {
  let years = []
  for (let i=0; i<10; i++) {
    let yr = decade + i;
    if (yr >= min_year && yr <= max_year) {
      years.push( decade + i );
    }
  }
  return years;
}


class SongExplorer {

  constructor() {
    this.songdat = songdb.db;
    let rootsel = '#song-explorer'
    this.root = d3.select(rootsel);
    this.margin = {top: 20, right: 20, bottom: 50, left: 20};

    let default_song = this.songdat[0];
    this.decade = default_song.decade;
    this.year = default_song.year;
    this.setupControls();
    // Set up the main 'picker' controls (for selecting decade, year, and ultimately song)
    // A container for the radar chart and associated elements (e.g. heading)
    this.songView = this.root.append('div').classed('song-view', true);
    this.songChart = new SongChart(this.songView);
    // The 'related songs' view (below the chart)
    this.moreSongs = this.root.append('div')
    let moreby = this.moreSongs.append('div')
      .classed('moreby', true)
      .classed('picker', true)
      .style('display', 'none')
    moreby.append('h4').classed('label', true);
    moreby.append('span').classed('songs', true);
    this.moreby = moreby;
    let simsongs = this.moreSongs.append('div')
      .classed('simsongs', true)
      .classed('picker', true)
    simsongs.append('h4').classed('label', true).text('Similar songs');
    simsongs.append('span').classed('songs', true);
    let simsongs_future = this.moreSongs.append('div')
      .classed('simsongs-future', true)
      .classed('picker', true)
    simsongs_future.append('h4').classed('label', true).text('Dissimilar songs');
    simsongs_future.append('span').classed('songs', true);
    this.selectSong(default_song);
  }

  get compact() {
    return isMobile();
  }

  onResize() {
    this.songChart.onResize();
  }

  setupControls() {
    let picker = this.root.append('div').classed('picker', true)

    let picker_ele_type = 'div';
    let decade_picker = picker.append(picker_ele_type).classed('decade-picker', true)

    decade_picker.selectAll('.decade-selector')
    .data(decades)
    .enter()
    .append('a')
    .classed('decade-selector', true)
    .classed('active', decade => decade == this.decade)
    .text(decade => decade+'s')
    .on('click', decade => this.setDecade(decade))

    this.year_picker = picker.append(this.compact ? 'select' : picker_ele_type)
      .classed('year-picker', true);
    if (this.compact) {
      this.year_picker.on('change', () => {
        this.years_for_decade()
      });
      this.dummy_year_option = this.song_picker.append('option')
      .classed('dummy', true)
      .attr('disabled', true)
      .html('select a year', true);
    }
    this.updateYears();

    this.song_picker = picker.append(this.compact ? 'select' : picker_ele_type)
      .classed('song-picker', true);
    if (this.compact) {
      this.song_picker.on('change', () => {
        this.selectSong(songdb.lookup(d3.event.target.value));
      });
      this.dummy_song_option = this.song_picker.append('option')
      .classed('dummy', true)
      .attr('disabled', true)
      .html('select a song', true);
    }
    this.updateSongs();
  }

  setDecade(decade) {
    if (decade == this.decade) return
    this.decade = decade
    this.root.selectAll('.decade-selector')
      .classed('active', decade => decade == this.decade);
    this.year = Math.min(max_year, Math.max(min_year, this.decade));
    this.updateYears();
    this.updateSongs();
  }

  // Update the year selector buttons (e.g. on decade change)
  updateYears() {
    let years = years_for_decade(this.decade);
    let yearsel = this.year_picker.selectAll('.year-selector').data(years)

    yearsel.exit().remove()

    let newyears = yearsel.enter()
    .append('a')
    .classed('year-selector', true)

    yearsel.merge(newyears)
      .text(year=>year)
      .on('click', year=>this.setYear(year))
      .classed('active', year=>year==this.year)
  }

  setYear(year) {
    console.debug('Setting year to ', year);
    this.year = year;
    this.year_picker.selectAll('.year-selector').classed('active', year=>year==this.year);
    this.updateSongs();
  }

  updateSongs() {
    // Update the selectable songs corresponding to year controls
    let songs = this.songdat.filter(song => song.year == this.year) 
    songs.sort( (a,b) => d3.ascending(a.track, b.track));
    let sel = this.song_picker.selectAll('.song-selector').data(songs, song=>song.track);

    sel.exit().remove();

    let newsongs = sel.enter()
    .append(this.compact ? 'option' : 'a')
    .classed('song-selector', true)

    sel = sel.merge(newsongs)
    .text(song=>song.track)
    if (this.compact) {
      sel
      .attr('value', song => song.track)
      .attr('selected', song => (song == this.song) ? '1' : null);
      this.dummy_song_option.attr('selected',
        (!this.song || this.song.year != this.year) ? '1' : null
      );
    } else {
      sel
      .on('click', song => this.selectSong(song))
      .on('mouseover', song => this.contrastSong(song))
      .on('mouseout', song => this.decontrastSong())
      .on('contextmenu', song => this.songChart.setSticky()) // XXX: temporary hack
      .classed('active', song => song==this.song);
    }
  }

  // (Used to fill in the various 'related songs' sections below the song chart)
  populateSongs(root, songs) {
    // TODO: refactor above
    let sel = root.selectAll('.song-selector').data(songs);
    sel.exit().remove();
    let newsongs = sel.enter()
    .append('a')
    .classed('song-selector', true)

    sel.merge(newsongs)
    .text(song=>song.track)
    .on('click', song => this.selectSong(song))
    .on('mouseover', song => this.contrastSong(song))
    .on('mouseout', song => this.decontrastSong())
    .on('contextmenu', song => this.songChart.setSticky()) // XXX: temporary hack
    .classed('active', song => song==this.song)

  }

  selectSong(song) {
    console.debug(`Setting song to ${song.track}`)
    this.song = song;
    // bleh
    if (this.compact) {
      this.updateSongs();
    } else {
      this.song_picker.selectAll('.song-selector').classed('active', song => song==this.song);
    }
    this.songChart.setSong(this.song);
    // there might be some redundant/repeated code paths here...
    this.setDecade(this.song.decade);
    this.setYear(this.song.year);
    this.updateMoreSongs();
  }

  updateMoreSongs() {
    let same_artist = this.songdat.filter(song => (
      (song.artist == this.song.artist) && (song.track != this.song.track)
    ))
    if (same_artist.length == 0) {
      this.moreby.style('display', 'none');
    } else {
      this.moreby.style('display', 'initial');
      this.moreby.select('.label').text(`More by ${this.song.artist}`);
      this.populateSongs(this.moreby.select('.songs'), same_artist);
    }

    let lookahead = 100;
    let lookbehind = 100;
    // XXX: Removing year restriction might make this really slow?
    let cands = this.songdat.filter(song => (
      ( (song.year - this.song.year) < lookahead )
      && ( (this.song.year - song.year) < lookbehind )
      && ( song.track != this.song.track )
    ));
    let n = 10;
    cands.sort( (s1, s2) => d3.descending(this.song.similarity(s1), this.song.similarity(s2)) );
    let sims = cands.slice(0, n);
    this.populateSongs(this.moreSongs.select('.simsongs .songs'), sims);
    // dissimilar
    sims = cands.slice(-n).reverse();
    this.populateSongs(this.moreSongs.select('.simsongs-future .songs'), sims);
  }

  contrastSong(song) {
    if (song == this.song) {
      return;
    }
    this.songChart.contrastSong(song);
  }

  decontrastSong() {
    this.songChart.decontrastSong();
  }

  static init() {
    return new SongExplorer();
  }
}

export default SongExplorer;

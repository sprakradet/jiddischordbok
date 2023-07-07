"use strict";

let diacritics_mapping = {
    "ú": "u",
    "í": "i",
    "é": "e",
    "á": "a",
    "ó": "o"    
}

function remove_diacritics(s) {
    return s.replace(/./g, function (c) {
	if (c in diacritics_mapping) {
	    return diacritics_mapping[c];
	} else {
	    return c;
	}
    });
}

function format_row(id, sv, yi) {
    let result = $("<div class='resultrow'></div>")
	.attr("id", "dictionary-entry-" + id);
    
    let wordwrapper = $("<div class='resultword'></div>");
    
    wordwrapper.append(
	$("<span class='sv-ord' lang='sv'></span>")
	    .text(sv.ord)
    );

    if (sv.lexnr) {
	wordwrapper.prepend(
	    $("<span class='lexnr'></span>")
		.text(sv.lexnr)
	);
    }

    if (sv.graminfo) {
	wordwrapper.append(
	    $("<span class='graminfo' lang='sv'></span>")
		.text(sv.graminfo)
	);
    }

    if (sv.komm) {
	wordwrapper.append(
	    $("<span class='kommentar' lang='sv'></span>")
		.text(sv.komm)
	);
    }

    result.append(wordwrapper);

    if (yi) {
	result.append(
	    $("<span class='resulttranslation' lang='yi-Latn-SE'></span>")
		.text(yi.ord.Latn)
	);

	result.append(
	    $("<span class='resultterm' lang='yi'></span>")
		.attr("dir", "rtl")
		.text(yi.ord.Hebr)
	);
    }

    return result;
}

let currentmultiget;

function dosearch(e) {
    let text = $("#searchquery").val();

    console.log("search -------------- " + text, allwords.length);

    let resultat = [];

    text = text.replace(/\u2067/g, "");

    if (text == "") {
	displayresults([]);
	return;
    }
    
    let sv_search = text.toLowerCase();
    let yi_latn_search = remove_diacritics(text.toLowerCase());

    let words = _.filter(allwords, function(e) {
	if (e.key_yi_latn) {
	    return e.key_sv.startsWith(sv_search) || e.key_yi_latn.startsWith(yi_latn_search) || e.key_yi_hebr.startsWith(text);
	} else {
	    return e.key_sv.startsWith(sv_search) || e.key_yi_hebr.startsWith(text);
	}
    });

    let word_ids = _.map(words, function(e) {
	return e.id;
    });

    let dictionary = dictionary_content_store();

    if (currentmultiget) {
	currentmultiget.aborted = true;
    }

    if (word_ids.length) {
	let keys = _.first(word_ids, 10);
	currentmultiget = new MultiGet(dictionary, keys, function(result) {
	    displayresults(result, dictionary);
	});
	currentmultiget.next();
    } else {
	displayresults([]);
    }
}
function displayresults(resultat, dictionary) {
    $(".lexikon-result").empty();
    let resultat_ids = _.map(resultat, function(e) {
	return e.ID;
    });

    let delay_render = [];

    _.each(resultat, function(e, i) {
	let entry = $("<div class='resultentry'></div>");

	if (e.sv.pekare) {
	    let pekare = _.keys(e.sv.pekare)[0];
	    console.log("pekare", e.sv.pekare, pekare, _.contains(resultat_ids, pekare));
	    if (!_.contains(resultat_ids, pekare)) {
		entry.append(format_row(pekare, e.sv.baslex, null));
		resultat_ids.push(pekare);
	    }
	    delay_render.push({row: format_row(e.ID, e.sv, e.yi), parent: "dictionary-entry-" + pekare});
	} else {
	    entry.append(format_row(e.ID, e.sv, e.yi));
	}
	
	$(".lexikon-result").append(entry);
    });

    _.each(delay_render, function(e, i) {
	console.log("delayed render", e);
	let parent = $(document.getElementById(e.parent));
	parent.append(e.row);
    });
}

var allwords = [];

function getwords() {
    console.log("indexing");
    allwords = [];
    dictionary_all_entries(function (entry) {
	let yi_latn_search;
	if (entry.value.yi.ord.Latn) {
	    yi_latn_search = remove_diacritics(entry.value.yi.ord.Latn.toLowerCase());
	} else {
	    yi_latn_search = null;
	}
	let sv_search = entry.value.sv.ord.toLowerCase();
	let yi_hebr_search = entry.value.yi.ord.Hebr.replace(/\u2067/g, "");
	allwords.push({
	    key_sv: sv_search,
	    key_yi_latn: yi_latn_search,
	    key_yi_hebr: yi_hebr_search,
	    id: entry.value.ID
	});
    }, function () {
	console.log("indexing completed");
    });
}

function setup_service_worker(){
    console.log("checking service worker support");
    if ('serviceWorker' in navigator) {
	console.log("trying to load service worker");
	navigator.serviceWorker.register('./cache.js').then(function(registration) {
	    console.log("registration", registration);
	    if (navigator.serviceWorker.controller) {
		console.log("service worker loaded");
	    } else {
		console.log("service worker not loaded");
	    }
	}).catch(function(error) {
	    console.log("service worker error", error);
	});
    } else {
	console.log("no service worker support");
    }    
}

$(document).ready(function () {
    init_dictionary("jiddischordbok", "kod/"+dictionary_file_name, getwords);
    
    $("#searchquery").focus();
    $("#searchquery").on("input", dosearch).change(dosearch);
    dosearch();
    $(".lexikon-search").submit(function (event) {
	event.preventDefault();
	$(".ui-menu-item").hide();
	setTimeout(function() {
	    $("#searchquery").blur();
	}, 0);
	dosearch(event);
    });

    setup_service_worker();
});

"use strict";

var dictionary_db;

function dictionary_content_store() {
    return dictionary_db.transaction(["content"]).objectStore("content");
}

function ensure_dictionary(wantedDictionaryUrl, completion) {
    console.log("ensure_dictionary", wantedDictionaryUrl);
    let metadataStore = dictionary_db.transaction(["metadata"]).objectStore("metadata");
    metadataStore.get("currenturl").onsuccess = function(event) {
	let currenturl_entry = event.target.result;
	console.log("last url", currenturl_entry);
	let fetch = false;
	if (currenturl_entry) {
	    if (wantedDictionaryUrl != currenturl_entry.value) {
		fetch = true;
	    }
	} else {
	    fetch = true;
	}
	console.log("fetch", fetch);
	if (fetch) {
	    $.ajax({url:wantedDictionaryUrl, datatype: "json", type:"GET",
		    success: function(json, status) {
			let transaction = dictionary_db.transaction(["metadata", "content"], "readwrite")
			let objectStore = transaction.objectStore("content");
			let metadataStore = transaction.objectStore("metadata");
			console.log("clearing content");
			let request = objectStore.clear();
			request.onerror = function() {
			    console.log("clearing failed");
			};
			request.onsuccess = function() {
			    console.log("clearing succeeded");
			};
			console.log("filling content");
			_.each(json, function(e, i) {
			    objectStore.put(e);
			});
			console.log("filled content");
			metadataStore.put({"key":"currenturl", "value":wantedDictionaryUrl});
			console.log("changed metadata", wantedDictionaryUrl);
			transaction.oncomplete = completion;
			transaction.onerror = function() {
			    console.log("transaction error", transaction.error);
			}
		    }
		   });
	} else {
	    completion();
	}
    };
}

function init_dictionary(databaseName, url, completion) {
    if (!window.indexedDB) {
	console.log("No IndexedDB");
	return;
    }

    var request = window.indexedDB.open(databaseName, 1);
    request.onerror = function(event) {
	console.log("IndexedDB error", event);
    };
    request.onsuccess = function(event) {
	console.log("database loaded");
	dictionary_db = event.target.result;
	dictionary_db.onerror = function(event) {
	    console.log("IndexedDB error " + event.target.error);
	};
	ensure_dictionary(url, function(event) {
	    console.log("ensure completed");
	    completion();
	})
    };

    request.onupgradeneeded = function(event) {
	console.log("creating database");
	let db = event.target.result;

	if (event.oldVersion < 1) {
	    db.createObjectStore("metadata", {keyPath : "key" });
	    db.createObjectStore("content", {keyPath : "ID" });
	}
    };
}

function MultiGet(index, keys, completion) {
    this.index = index;
    this.keys = keys;
    this.completion = completion;
    this.result = [];
    this.aborted = false;
    this.next = function () {
	if (this.aborted) {
	    return;
	}
//	console.log("MultiGet next");
	if (keys.length) {
//	    console.log("MultiGet keys", keys);
	    let self = this;
	    index.get(keys[0]).onsuccess = function(event) {
//		console.log("pushing", event.target.result);
		self.result.push(event.target.result);
		self.keys.shift();
		self.next();
	    };
	} else {
	    completion(this.result);
	}
    };
}

function dictionary_all_entries(entry_function, completion_function) {
    let dictionary = dictionary_content_store();
    dictionary.openCursor().onsuccess = function (event) {
	let cursor = event.target.result;
	if (cursor) {
	    entry_function(cursor);
	    cursor.continue();
	} else if (completion_function) {
	    completion_function();
	}
    };
}

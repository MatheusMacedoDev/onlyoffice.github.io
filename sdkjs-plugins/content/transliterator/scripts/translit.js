(function(window) {
	"use strict";

	var TABLE_FILES = {
		iso9: "./tables/iso9.json",
		icao: "./tables/icao.json",
		gost779b: "./tables/gost779b.json",
		elot743: "./tables/elot743.json"
	};

	var NON_REVERSIBLE_TABLES = {
		icao: true
	};

	var SCRIPT_BASE_URL = (function() {
		var currentScript = (document.currentScript);

		if (currentScript && currentScript.src) {
			return currentScript.src;
		}

		return window.location.href;
	})();

	function createTrieNode() {
		return {
			children: Object.create(null),
			value: null
		};
	}

	function insertIntoTrie(root, key, value) {
		var node = root;
		var index;
		var symbol;

		for (index = 0; index < key.length; index += 1) {
			symbol = key.charAt(index);

			if (!node.children[symbol]) {
				node.children[symbol] = createTrieNode();
			}

			node = node.children[symbol];
		}

		node.value = value;
	}

	function buildTrie(pairs, sourceIndex, targetIndex) {
		var root = createTrieNode();
		var index;
		var pair;
		var source;
		var target;

		for (index = 0; index < pairs.length; index += 1) {
			pair = pairs[index];
			source = pair[sourceIndex];
			target = pair[targetIndex];

			if (!source || target === undefined || target === null) {
				continue;
			}

			insertIntoTrie(root, source, target);
		}

		return root;
	}

	function transliterateWithTrie(input, trie) {
		var output = "";
		var start = 0;
		var cursor;
		var node;
		var nextNode;
		var lastMatchValue;
		var lastMatchLength;

		while (start < input.length) {
			node = trie;
			lastMatchValue = null;
			lastMatchLength = 0;
            
            // Trie traversal naturally implements the longest match rule.
			for (cursor = start; cursor < input.length; cursor += 1) {
				nextNode = node.children[input.charAt(cursor)];

				if (!nextNode) {
					break;
				}

				node = nextNode;

				if (node.value !== null) {
					lastMatchValue = node.value;
					lastMatchLength = cursor - start + 1;
				}
			}

			if (lastMatchLength > 0) {
				if (lastMatchValue === null) {
                    throw new Error("Unknown error during transliteration: no value found for matched input segment. Start index: " + start + ", length: " + lastMatchLength);
				}

				var matchedValue = lastMatchValue;

                // Handle case matching for the transliterated value based on the input segment.
				output += applyMatchCase(
					input.slice(start, start + lastMatchLength),
					matchedValue,
					input.charAt(start + lastMatchLength)
				);
				start += lastMatchLength;
			} else {
                // No match found, preserve the original character.
				output += input.charAt(start);
				start += 1;
			}
		}

		return output;
	}

	function isUpperCaseValue(value) {
		return value.toUpperCase() === value && value.toLowerCase() !== value;
	}

	function isLowerCaseValue(value) {
		return value.toLowerCase() === value && value.toUpperCase() !== value;
	}

	function capitalizeFirstLetter(value) {
		if (!value) {
			return value;
		}

		return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
	}

	function applyMatchCase(sourceSegment, transliteratedValue, nextSourceChar) {
		var isSingleUppercaseSource;
		var nextIsLowercase;

		if (!sourceSegment || !transliteratedValue) {
			return transliteratedValue;
		}

		if (sourceSegment.length > 1) {
			if (isUpperCaseValue(sourceSegment)) {
				return transliteratedValue.toUpperCase();
			}

			if (isLowerCaseValue(sourceSegment)) {
				return transliteratedValue.toLowerCase();
			}

			return transliteratedValue;
		}

		isSingleUppercaseSource = isUpperCaseValue(sourceSegment);

		if (!isSingleUppercaseSource) {
			return transliteratedValue;
		}

		nextIsLowercase = !!nextSourceChar && isLowerCaseValue(nextSourceChar);

		if (transliteratedValue.length > 1 && nextIsLowercase) {
			return capitalizeFirstLetter(transliteratedValue);
		}

		return transliteratedValue.toUpperCase();
	}

	function createDirectionMap(tableName, pairs) {
		var directions = Object.create(null);

		directions.forward = {
			name: "forward",
			trie: buildTrie(pairs, 1, 0)
		};

		if (!NON_REVERSIBLE_TABLES[tableName]) {
			directions.reverse = {
				name: "reverse",
				trie: buildTrie(pairs, 0, 1)
			};
		}

		return directions;
	}


	function fetchJson(url) {
		var resolvedUrl = new URL(url, SCRIPT_BASE_URL).toString();

		return fetch(resolvedUrl).then(function(response) {
			if (!response.ok) {
				throw new Error("Failed to load transliteration table: " + resolvedUrl);
			}

			return response.json();
		});
	}

	var Transliterator = {
		tables: Object.create(null),
		isLoaded: false,
		loadPromise: null,

		load: function() {
			var self = this;
			var tableNames;

			if (self.loadPromise) {
				return self.loadPromise;
			}

			tableNames = Object.keys(TABLE_FILES);
			self.loadPromise = Promise.all(tableNames.map(function(tableName) {
				return fetchJson(TABLE_FILES[tableName]).then(function(payload) {
					var pairs = payload && payload.table ? payload.table : [];

					self.tables[tableName] = createDirectionMap(tableName, pairs);
				});
			})).then(function() {
				self.isLoaded = true;
				return self.tables;
			}).catch(function(error) {
				self.loadPromise = null;
				throw error;
			});

			return self.loadPromise;
		},

		getTrie: function(tableName, direction) {
			var table = this.tables[tableName];

			if (!table) {
				return null;
			}

			return table[direction] ? table[direction].trie : null;
		},

		transliterate: function(input, tableName, direction) {
			var trie = this.getTrie(tableName, direction);

			if (!trie) {
				throw new Error("Unknown transliteration direction: " + tableName + "/" + direction);
			}

			return transliterateWithTrie(input, trie);
		}
	};

	var globalWindow = window;
	globalWindow.Transliterator = Transliterator;
})(window);

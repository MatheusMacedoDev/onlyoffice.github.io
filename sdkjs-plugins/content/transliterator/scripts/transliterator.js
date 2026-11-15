(function(window, document) {
    "use strict";

    var TABLES = {
        "passport-icao-9303": { file: "icao.json", script: "cyrillic" },
        "gost-7.79-system-b": { file: "gost779b.json", script: "cyrillic" },
        "iso-9": { file: "iso9.json", script: "cyrillic" },
        "elot-743": { file: "elot743.json", script: "greek" }
    };
    var DIRECTIONS = {
        "cyrillic-to-latin": { sourceIndex: 1, targetIndex: 0, script: "cyrillic" },
        "latin-to-cyrillic": { sourceIndex: 0, targetIndex: 1, script: "cyrillic" },
        "greek-to-latin": { sourceIndex: 1, targetIndex: 0, script: "greek" },
        "latin-to-greek": { sourceIndex: 0, targetIndex: 1, script: "greek" }
    };
    var button = document.getElementById("apply");
    var status = document.getElementById("status");

    function createTrieNode() {
        return {
            children: {},
            value: null
        };
    }

    function buildTrie(table, direction) {
        var root = createTrieNode();
        table.forEach(function(pair) {
            var source = pair[direction.sourceIndex];
            var target = pair[direction.targetIndex];
            var node = root;
            var index;
            var character;

            if (typeof source !== "string" || source === "" || typeof target !== "string") {
                return;
            }

            for (index = 0; index < source.length; index += 1) {
                character = source.charAt(index);
                if (!Object.prototype.hasOwnProperty.call(node.children, character)) {
                    node.children[character] = createTrieNode();
                }
                node = node.children[character];
            }

            node.value = target;
        });

        return root;
    }

    function loadRules(tableChoice, directionChoice) {
        var tableConfig = TABLES[tableChoice];
        var directionConfig = DIRECTIONS[directionChoice];

        if (!tableConfig || !directionConfig || tableConfig.script !== directionConfig.script) {
            return Promise.reject(new Error("The selected table does not support this direction."));
        }
        if (tableChoice === "passport-icao-9303" && directionChoice !== "cyrillic-to-latin") {
            return Promise.reject(new Error("The Passport (ICAO 9303) table supports Cyrillic to Latin only."));
        }

        var url = new URL("scripts/tables/" + tableConfig.file, window.location.href).toString();
        return fetch(url).then(function(response) {
            if (!response.ok) {
                throw new Error("Failed to load transliteration table: " + url);
            }
            return response.json();
        }).then(function(payload) {
            if (!payload || !Array.isArray(payload.table)) {
                throw new Error("Invalid transliteration table: " + url);
            }
            return buildTrie(payload.table, directionConfig);
        });
    }

    function applyToSelection() {
        var directionChoice = document.getElementById("direction").value;
        var tableChoice = document.getElementById("standard").value;

        button.disabled = true;
        status.textContent = "Applying...";

        loadRules(tableChoice, directionChoice).then(function(rules) {
            window.Asc.scope.rules = rules;
            window.Asc.plugin.callCommand(function() {
                var trie = Asc.scope.rules;

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

                function applyMatchCase(source, target, nextSourceChar) {
                    if (!source || !target) {
                        return target;
                    }
                    if (source.length > 1) {
                        if (isUpperCaseValue(source)) {
                            return target.toUpperCase();
                        }
                        if (isLowerCaseValue(source)) {
                            return target.toLowerCase();
                        }
                        return target;
                    }
                    if (!isUpperCaseValue(source)) {
                        return target;
                    }
                    if (target.length > 1 && nextSourceChar && isLowerCaseValue(nextSourceChar)) {
                        return capitalizeFirstLetter(target);
                    }
                    return target.toUpperCase();
                }

                function transliterate(input) {
                    var output = "";
                    var start = 0;
                    var cursor;
                    var node;
                    var nextNode;
                    var matchValue;
                    var matchLength;
                    var target;

                    while (start < input.length) {
                        node = trie;
                        matchValue = null;
                        matchLength = 0;

                        for (cursor = start; cursor < input.length; cursor += 1) {
                            nextNode = node.children[input.charAt(cursor)];
                            if (!nextNode) {
                                break;
                            }

                            node = nextNode;
                            if (node.value !== null) {
                                matchValue = node.value;
                                matchLength = cursor - start + 1;
                            }
                        }

                        if (matchLength > 0) {
                            target = applyMatchCase(
                                input.slice(start, start + matchLength),
                                matchValue,
                                input.charAt(start + matchLength)
                            );
                            output += target;
                            start += matchLength;
                        } else {
                            output += input.charAt(start);
                            start += 1;
                        }
                    }
                    return output;
                }

                var count = 0;
                Api.GetSelection().ForEach(function(cell) {
                    var formula = cell.GetFormula();
                    if (typeof formula === "string" && formula.charAt(0) === "=") {
                        return;
                    }

                    var value = cell.GetValue();
                    if (typeof value === "string" && value !== "") {
                        cell.SetValue(transliterate(value));
                        count += 1;
                    }
                });
                return count;
            }, false);
            status.textContent = "Command sent.";
        }).catch(function(error) {
            status.textContent = error.message;
        }).then(function() {
            button.disabled = false;
        });
    }

    button.addEventListener("click", applyToSelection);

    window.Asc.plugin.init = function() {
        var isSpreadsheet = this.info && this.info.editorType === "cell";
        button.disabled = !isSpreadsheet;
        if (!isSpreadsheet) {
            status.textContent = "Applying to selected cells is available in the spreadsheet editor.";
        }
    };
})(window, document);

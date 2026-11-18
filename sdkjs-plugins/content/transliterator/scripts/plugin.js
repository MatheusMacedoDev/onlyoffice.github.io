/**
 *
 * (c) Copyright Ascensio System SIA 2020
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

let sourceText = "";
let transliteratedLines = [];
let busyReplacing = false;
let isEventListenersAttached = false;
const DIRECTION_MAPPINGS = {
    "cyrillic-to-latin": "forward",
    "latin-to-cyrillic": "reverse",
    "greek-to-latin": "forward",
};

async function getWordAndSlideSourceText() {
    return new Promise((resolve) => {
        window.Asc.plugin.executeMethod(
            "GetSelectedText",
            [
                {
                    Numbering: false,
                    Math: false,
                    ParaSeparator: "\n",
                    TableCellSeparator: "\n",
                    TableRowSeparator: "\n",
                    TabSymbol: "\t",
                },
            ],
            function (text) {
                resolve(text ? text : "");
            },
        );
    });
}

async function getCellSourceText() {
    return new Promise((resolve) => {
        window.Asc.plugin.callCommand(
            function () {
                const selection = Api.GetSelection();
                const values = [];

                selection.ForEach((cell) => {
                    const formula = cell.GetFormula();

                    if (
                        typeof formula === "string" &&
                        formula.charAt(0) === "="
                    )
                        return;

                    const value = cell.GetValue();
                    if (typeof value === "string" && value.length > 0)
                        values.push(value);
                });

                return values;
            },
            false,
            false,
            function (values) {
                return resolve(Array.isArray(values) ? values.join("\n") : "");
            },
        );
    });
}

async function getSourceText() {
    const editorType = Asc.plugin.info.editorType;

    if (editorType === "cell") return await getCellSourceText();
    else if (editorType === "slide" || editorType === "word")
        return await getWordAndSlideSourceText();
}

function replaceCells(standard, direction) {
    const trie = Transliterator.getTrie(
        standard,
        DIRECTION_MAPPINGS[direction],
    );

    if (!trie) {
        return Promise.reject(
            new Error(
                "No transliteration rules for the selected table and direction",
            ),
        );
    }

    // Store the computed trie in a global variable so that it can be accessed by callCommand
    window.Asc.scope.rules = trie;

    return new Promise(function (resolve, reject) {
        try {
            window.Asc.plugin.callCommand(
                function () {
                    var trie = Asc.scope.rules;

                    function isUpperCaseValue(value) {
                        return (
                            value.toUpperCase() === value &&
                            value.toLowerCase() !== value
                        );
                    }

                    function isLowerCaseValue(value) {
                        return (
                            value.toLowerCase() === value &&
                            value.toUpperCase() !== value
                        );
                    }

                    function capitalizeFirstLetter(value) {
                        if (!value) return value;
                        return (
                            value.charAt(0).toUpperCase() +
                            value.slice(1).toLowerCase()
                        );
                    }

                    // Handles capitalization rules,
                    // examples: "Щ" -> "Shch", "Ща" -> "Sha", "ЩА" -> "SHA"
                    function applyMatchCase(source, target, nextSourceChar) {
                        if (!source || !target) return target;

                        if (source.length > 1) {
                            if (isUpperCaseValue(source))
                                return target.toUpperCase();
                            if (isLowerCaseValue(source))
                                return target.toLowerCase();
                            return target;
                        }

                        if (!isUpperCaseValue(source)) return target;

                        if (
                            target.length > 1 &&
                            nextSourceChar &&
                            isLowerCaseValue(nextSourceChar)
                        )
                            return capitalizeFirstLetter(target);

                        return target.toUpperCase();
                    }

                    function transliterate(input, trie) {
                        var output = "";
                        var start = 0;
                        var cursor;
                        var node;
                        var nextNode;
                        var lastMatchValue;
                        var lastMatchLength;

                        while (start < input.length) {
                            // Restart at the root for each unprocessed character.
                            node = trie;
                            lastMatchValue = null;
                            lastMatchLength = 0;
                            // Trie traversal naturally implements the longest match rule.
                            for (
                                cursor = start;
                                cursor < input.length;
                                cursor += 1
                            ) {
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
                                // Handle case matching for the transliterated value based on the input segment.
                                output += applyMatchCase(
                                    input.slice(start, start + lastMatchLength),
                                    lastMatchValue,
                                    input.charAt(start + lastMatchLength),
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

                    var count = 0;
                    Api.GetSelection().ForEach(function (cell) {
                        var f = cell.GetFormula();
                        if (typeof f === "string" && f.charAt(0) === "=")
                            return;

                        var v = cell.GetValue();
                        if (typeof v === "string" && v !== "") {
                            cell.SetValue(transliterate(v, trie));
                            count++;
                        }
                    });

                    return count;
                },
                false,
                true,
                function (count) {
                    if (typeof count !== "number") {
                        reject(
                            new Error(
                                "Could not retrieve the converted cell count",
                            ),
                        );
                        return;
                    }

                    resolve(count);
                },
            );
        } catch (error) {
            reject(error);
        }
    });
}

(function (window) {
    "use strict";

    const ALL_STANDARD_OPTIONS = [
        { value: "icao", label: "Passport (ICAO 9303)" },
        { value: "gost779b", label: "GOST 7.79 System B" },
        { value: "iso9", label: "ISO 9" },
        { value: "elot743", label: "Greek (ELOT 743)" },
    ];

    const buttons = {
        replace: null,
        copy: null,
        refresh: null,
    };

    const DIRECTION_TO_STANDARDS_MAPPING = {
        "cyrillic-to-latin": ["icao", "gost779b", "iso9"],
        "latin-to-cyrillic": ["gost779b", "iso9"],
        "greek-to-latin": ["elot743"],
    };

    const NO_LETTERS_STATUS = {
        "cyrillic-to-latin": "No Cyrillic letters found",
        "latin-to-cyrillic": "No Latin letters found",
        "greek-to-latin": "No Greek letters found",
    };

    const EXAMPLE_SOURCES = {
        "cyrillic-to-latin": {
            icao: "Щукин",
            gost779b: "Щукин",
            iso9: "Щукин",
        },
        "latin-to-cyrillic": {
            gost779b: "shhuka",
            iso9: "ŝuka",
        },
        "greek-to-latin": {
            elot743: "Αθηνα",
        },
    };

    function renderStandards(select, selectedDirection) {
        const startSelectedStandard = select.value;

        const newOptions = ALL_STANDARD_OPTIONS.filter((option) => {
            return DIRECTION_TO_STANDARDS_MAPPING[selectedDirection].includes(
                option.value,
            );
        }).map((standard) => new Option(standard.label, standard.value));

        select.replaceChildren(...newOptions);

        const optionStillExists = newOptions.some(
            (option) => option.value === startSelectedStandard,
        );

        select.value = optionStillExists
            ? startSelectedStandard
            : newOptions[0].value;
    }

    function directionToLabelArray(direction) {
        return direction
            .replace("-to-", "-")
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
    }

    function renderLabels(selectedLabel, transliteratedLabel, direction) {
        const labelArray = directionToLabelArray(direction);
        selectedLabel.innerText = labelArray[0];
        transliteratedLabel.innerText = labelArray[1];
    }

    function renderExample(example, standard, direction) {
        const source =
            EXAMPLE_SOURCES[direction] && EXAMPLE_SOURCES[direction][standard];

        if (!source) {
            example.innerText = "";
            return;
        }

        const converted = Transliterator.transliterate(
            source,
            standard,
            DIRECTION_MAPPINGS[direction],
        );
        example.innerText = "Example: " + source + " → " + converted;
    }

    function renderPreviewTexts(
        selectedPreview,
        transliteratedPreview,
        selectedText,
        transliteratedLines,
    ) {
        selectedPreview.innerText = selectedText
            ? selectedText.slice(0, 500)
            : "Select text to transliterate";

        transliteratedPreview.innerText = selectedText
            ? transliteratedLines.join("\n").slice(0, 500)
            : "Transliteration";
    }

    function transliterateLines(selectedText, standard, direction) {
        if (!selectedText) return [];

        const normalizedText = selectedText.replace(/\r\n?/g, "\n");
        const textWithoutTrailingNewline = normalizedText.endsWith("\n")
            ? normalizedText.slice(0, -1)
            : normalizedText;

        return textWithoutTrailingNewline.split("\n").map(function (line) {
            return Transliterator.transliterate(
                line,
                standard,
                DIRECTION_MAPPINGS[direction],
            );
        });
    }

    function updateButtons() {
        buttons.replace.disabled = busyReplacing || !sourceText;
        buttons.copy.disabled = busyReplacing || !sourceText;
        buttons.refresh.disabled = busyReplacing;
    }

    async function copyTransliteration(replaceStatus) {
        const text = transliteratedLines.join("\n");
        if (!text) return;

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(text);
                } catch (error) {
                    throw new Error("Copy command was rejected");
                }
            }

            replaceStatus.innerText = "Copied";
        } catch (error) {
            replaceStatus.innerText = "Could not copy to clipboard";
        }
    }

    async function refreshSelection(
        replaceStatus,
        selectedPreview,
        transliteratedPreview,
        standard,
        direction,
    ) {
        replaceStatus.innerText = "Reading selection...";

        try {
            sourceText = (await getSourceText()) || "";
            transliteratedLines = transliterateLines(
                sourceText,
                standard,
                direction,
            );

            renderPreviewTexts(
                selectedPreview,
                transliteratedPreview,
                sourceText,
                transliteratedLines,
            );
        } catch (error) {
            sourceText = "";
            transliteratedLines = [];

            replaceStatus.innerText = error.message;
            return false;
        } finally {
            updateButtons();
        }

        const convertedText = transliteratedLines.join("\n");
        const comparableSource = sourceText
            .replace(/\r\n?/g, "\n")
            .replace(/\n$/, "");

        replaceStatus.innerText =
            sourceText && convertedText === comparableSource
                ? NO_LETTERS_STATUS[direction]
                : "";
        return true;
    }

    async function replaceSelection(
        replaceStatus,
        replaceButton,
        selectedPreview,
        transliteratedPreview,
        standard,
        direction,
    ) {
        if (busyReplacing || !sourceText) return;

        busyReplacing = true;
        replaceButton.disabled = true;
        replaceStatus.innerText = "Replacing...";

        try {
            if (window.Asc.plugin.info.editorType === "cell") {
                const convertedText = transliteratedLines.join("\n");
                const count = await replaceCells(standard, direction);

                const selectionRefreshed = await refreshSelection(
                    replaceStatus,
                    selectedPreview,
                    transliteratedPreview,
                    standard,
                    direction,
                );

                if (count > 0 && !sourceText) {
                    sourceText = convertedText;
                    transliteratedLines = transliterateLines(
                        sourceText,
                        standard,
                        direction,
                    );
                    renderPreviewTexts(
                        selectedPreview,
                        transliteratedPreview,
                        sourceText,
                        transliteratedLines,
                    );
                }

                const replacementStatus =
                    "Replaced " + count + (count === 1 ? " cell" : " cells");
                replaceStatus.innerText = selectionRefreshed
                    ? replacementStatus
                    : replacementStatus + ". " + replaceStatus.innerText;
                return;
            }

            const isDone = await new Promise(function (resolve) {
                window.Asc.plugin.executeMethod(
                    "ReplaceTextSmart",
                    [transliteratedLines, "\t", "\n"],
                    function (result) {
                        resolve(result);
                    },
                );
            });

            if (isDone === false) {
                replaceStatus.innerText = "Could not replace this selection";
                return;
            }

            await refreshSelection(
                replaceStatus,
                selectedPreview,
                transliteratedPreview,
                standard,
                direction,
            );

            replaceStatus.innerText = "Done";
        } catch (error) {
            replaceStatus.innerText = error.message;
        } finally {
            busyReplacing = false;
            updateButtons();
        }
    }

    window.Asc.plugin.init = async function () {
        const directionSelect = document.getElementById("direction");
        const standardSelect = document.getElementById("standard");
        const selectedLabel = document.getElementById("selected-label");
        const transliteratedLabel = document.getElementById(
            "transliterated-label",
        );
        const selectedPreview = document.getElementById("selected-preview");
        const transliteratedPreview = document.getElementById(
            "transliterated-preview",
        );
        const replaceButton = document.getElementById("replace-button");
        const copyButton = document.getElementById("copy-button");
        const refreshButton = document.getElementById("refresh-button");
        const replaceStatus = document.getElementById("replace-status");
        const example = document.getElementById("example");

        buttons.replace = replaceButton;
        buttons.copy = copyButton;
        buttons.refresh = refreshButton;

        try {
            await Transliterator.load();
        } catch (error) {
            replaceStatus.innerText = "Could not load transliteration tables";
            replaceButton.disabled = true;
            return;
        }

        renderStandards(standardSelect, directionSelect.value);
        renderLabels(selectedLabel, transliteratedLabel, directionSelect.value);
        renderExample(example, standardSelect.value, directionSelect.value);

        await refreshSelection(
            replaceStatus,
            selectedPreview,
            transliteratedPreview,
            standardSelect.value,
            directionSelect.value,
        );

        if (!isEventListenersAttached) {
            directionSelect.addEventListener("change", async () => {
                renderStandards(standardSelect, directionSelect.value);
                renderLabels(
                    selectedLabel,
                    transliteratedLabel,
                    directionSelect.value,
                );
                renderExample(
                    example,
                    standardSelect.value,
                    directionSelect.value,
                );

                await refreshSelection(
                    replaceStatus,
                    selectedPreview,
                    transliteratedPreview,
                    standardSelect.value,
                    directionSelect.value,
                );
            });

            standardSelect.addEventListener("change", async () => {
                renderExample(
                    example,
                    standardSelect.value,
                    directionSelect.value,
                );

                await refreshSelection(
                    replaceStatus,
                    selectedPreview,
                    transliteratedPreview,
                    standardSelect.value,
                    directionSelect.value,
                );
            });

            copyButton.addEventListener("click", () =>
                copyTransliteration(replaceStatus),
            );

            refreshButton.addEventListener("click", async () => {
                await refreshSelection(
                    replaceStatus,
                    selectedPreview,
                    transliteratedPreview,
                    standardSelect.value,
                    directionSelect.value,
                );
            });

            replaceButton.addEventListener("click", () =>
                replaceSelection(
                    replaceStatus,

                    selectedPreview,
                    transliteratedPreview,
                    standardSelect.value,
                    directionSelect.value,
                ),
            );

            isEventListenersAttached = true;
        }
    };
})(window, undefined);

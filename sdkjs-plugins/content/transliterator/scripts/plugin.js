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

async function getWordAndSlideSourceText() {
    return new Promise((resolve) => {
        window.Asc.plugin.executeMethod("GetSelectedText", [], function (text) {
            resolve(text ? text : "");
        });
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
                    const value = cell.GetValue();

                    if (
                        typeof formula === "string" &&
                        formula.charAt(0) === "="
                    )
                        return;

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

(function (window) {
    "use strict";

    const ALL_STANDARD_OPTIONS = [
        { value: "icao", label: "Passport (ICAO 9303)" },
        { value: "gost779b", label: "GOST 7.79 System B" },
        { value: "iso9", label: "ISO 9" },
        { value: "elot743", label: "Greek (ELOT 743)" },
    ];

    const DIRECTION_TO_STANDARDS_MAPPING = {
        "cyrillic-to-latin": ["icao", "gost779b", "iso9"],
        "latin-to-cyrillic": ["gost779b", "iso9"],
        "greek-to-latin": ["elot743"],
    };

    const DIRECTION_MAPPINGS = {
        "cyrillic-to-latin": "forward",
        "latin-to-cyrillic": "reverse",
        "greek-to-latin": "forward",
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

        if (optionStillExists) {
            select.value = startSelectedStandard;
        }
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

    function renderPreviewTexts(
        selectedPreview,
        transliteratedPreview,
        sourceText,
        standard,
        direction,
    ) {
        if (selectedPreview && sourceText) {
            selectedPreview.innerText = sourceText.slice(0, 500);
        }

        if (selectedPreview && !sourceText) {
            selectedPreview.innerText = "Select text";
        }

        let transliteratedText = "";

        if (sourceText) {
            transliteratedText = Transliterator.transliterate(
                sourceText,
                standard,
                DIRECTION_MAPPINGS[direction],
            );

            if (transliteratedPreview) {
                transliteratedPreview.innerText = transliteratedText;
            }
        }

        if (transliteratedPreview && !sourceText) {
            transliteratedPreview.innerText = "Transliteration";
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

        const sourceText = await getSourceText();

        if (!sourceText) console.log("Source text is empty");

        await Transliterator.load();

        renderStandards(standardSelect, directionSelect.value);
        renderLabels(selectedLabel, transliteratedLabel, directionSelect.value);
        renderPreviewTexts(
            selectedPreview,
            transliteratedPreview,
            sourceText,
            standardSelect.value,
            directionSelect.value,
        );

        directionSelect.addEventListener("change", () => {
            renderStandards(standardSelect, directionSelect.value);
            renderLabels(
                selectedLabel,
                transliteratedLabel,
                directionSelect.value,
            );
            renderPreviewTexts(
                selectedPreview,
                transliteratedPreview,
                sourceText,
                standardSelect.value,
                directionSelect.value,
            );
        });

        standardSelect.addEventListener("change", () => {
            renderPreviewTexts(
                selectedPreview,
                transliteratedPreview,
                sourceText,
                standardSelect.value,
                directionSelect.value,
            );
        });
    };
})(window, undefined);

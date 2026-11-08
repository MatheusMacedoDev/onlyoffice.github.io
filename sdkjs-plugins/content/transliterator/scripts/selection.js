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

// Example insert text into editors (different implementations)

async function getWordAndSlideSourceText() {
    return new Promise((resolve) => {
        window.Asc.plugin.executeMethod("GetSelectedText", [], 
            function (text) {
                resolve(text ? text : "");
            }
        );
    });
}

async function getCellSourceText() {
    return new Promise((resolve) => {
        window.Asc.plugin.callCommand(
            function() {
                const selection = Api.GetSelection();
                const values = [];

                selection.ForEach((cell) => {
                    const formula = cell.GetFormula();
                    const value = cell.GetValue();

                    if (typeof formula === "string" && formula.charAt(0) === "=")
                        return;

                    if (typeof value === "string" && value.length > 0)
                        values.push(value);
                });

                return values;
            },
            false,
            false,
            function(values) {
                return resolve(
                    Array.isArray(values)
                        ? values.join("\n")
                        : ""
                );
            }
        );
    });
}

async function getSourceText() {
    const editorType = Asc.plugin.info.editorType;

    if (editorType === "cell")
        return await getCellSourceText();
    else if (editorType === "slide" || editorType === "word")
        return await getWordAndSlideSourceText();
}

(function(window){
    window.Asc.plugin.init = async function() {
        let sourceText = await getSourceText();

        if (!sourceText)
            console.log("Source text is empty");

        var preview = document.getElementById("preview");

        if (preview) {
            preview.value = sourceText.slice(0, 500);
        }
    }
})(window, undefined);

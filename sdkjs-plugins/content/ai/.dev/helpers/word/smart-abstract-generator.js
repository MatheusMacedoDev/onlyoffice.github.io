/*
 * (c) Copyright Ascensio System SIA 2010-2025
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-6 Ernesta Birznieka-Upish
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

(function () {
    let func = new RegisteredFunction({
        "name": "smartAbstractGenerator",
        "text": "Smart Abstract Generator",
        "description": "Use this function to generate an abstract for a given text. If no text is selected, use the entire document.",
        "parameters": {
            "type": "object",
            "properties": {
                "mainLanguage": {
                    "type": "string",
                    "description": "Language chosen for the abstract generation. If not specified, the default language will be the same as the selected text or document.",
                },
                "foreignLanguage": {
                    "type": "string",
                    "description": "Language chosen for the foreign language abstract generation. If not specified, no foreign language abstract will be generated.",
                },
                "wordLimit": {
                    "type": "integer",
                    "description": "Word limit for the generated abstract.",
                    "minimum": 100,
                    "maximum": 500,
                    "default": 250,
                }
            },
            "required": [],
        },
        "examples": [
            {
                "prompt": "Create an abstract for the selected text in the document.",
                "arguments": {},
            },
            {
                "prompt": "Create an summary.",
                "arguments": {},
            },
            {
                "prompt": "Generate an abstract for the selected text in the document, with a 250-word limit.",
                "arguments": { "wordLimit": 250 },
            },
            {
                "prompt": "Make an English summary with a 300 words limit.",
                "arguments": { "mainLanguage": "English", "wordLimit": 300 },
            },
            {
                "prompt": "Generate an abstract in Portuguese and English.",
                "arguments": { "mainLanguage": "Portuguese", "foreignLanguage": "English" },
            },
        ]
    });

    func.call = async function (params) {
        return {
            status: "ok",
        }
    };

    return func;
})();

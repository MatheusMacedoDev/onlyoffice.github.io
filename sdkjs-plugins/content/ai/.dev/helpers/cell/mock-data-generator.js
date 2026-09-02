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
    name: "mockDataGenerator",
    description:
      "Generate mock data for a selected table header with type infer based on the name of each field. If no header is selected, works with the current table header.",
    parameters: {
      type: "object",
      properties: {
        range: {
          type: "string",
          description: "Cell range with the table header (e.g., 'A1:C1'). If omitted, uses the selected header or the current table header.",
        },
        type: {
          type: "rows",
          description: "Amount of rows to fill with generated mock data.",
          default: 10,
        },
      },
      required: ["range"],
    },
    examples: [
      {
        prompt: "Generate data for the selected table header",
        arguments: {},
      },
      {
        prompt: "Fill the table below the current header with realistic fake data",
        arguments: {},
      },
      {
        prompt: "Generate 20 rows of mock data for the selected header",
        arguments: { rows: 20 },
      },
      {
        prompt: "Create sample data with 5 rows for the header range A1:C1",
        arguments: { range: "A1:C1", rows: 5 },
      }
    ]
  });

  func.call = async function (params) {
  };

  return func;
})();

---
title: EXL Adobe Preview test
description: Examples of Adobe EXL markdown syntax for testing the Adobe Preview webview.
---

# EXL Adobe Preview test

Use the **Adobe Preview** command to open this file in the extension's dedicated preview panel (Command Palette: `Adobe Preview`, or the grid icon in the editor title bar when a Markdown file is focused). The built-in VS Code Markdown preview no longer applies EXL styling.

>[!CONTEXTUALHELP]
>id="models_insights_undefinedchannels"
>title="Undefined channels"
>abstract="Undefined channels are included, but have no attributed conversions."

A horizontal bar graph visualization that displays the ROI or CPA performance by each of the channels. This visualization highlights the ROI / CPA of your marketing investments. The channels are ranked in descending order based on ROI / CPA. The visualization helps to identify which channels are most effective and which might need optimization.

## Alert blocks

>[!TIP]
>
>This is a tip. Use tips for optional but helpful information.

>[!IMPORTANT]
>
>This is an important alert. Use for information the reader must not overlook.

>[!WARNING]
>
>This is a warning. Use for information about potential issues.

>[!CAUTION]
>
>This is a caution. Use for information about potential risks.

>[!ERROR]
>
>This is an error-style alert.

>[!SUCCESS]
>
>This is a success-style alert.

>[!INFO]
>
>This is an info alert.

>[!ADMIN]
>
>This is an admin alert. For admin-only content.

>[!AVAILABILITY]
>
>This is an availability note. For feature availability details.

>[!PREREQUISITES]
>
>This is a prerequisites block. List what the reader needs before starting.

>[!NOTE]
>
>Note with inline code: use `apiKey` and `secretToken` to authenticate. Block code below:
>
>```json
>{ "apiKey": "abc123", "secretToken": "xyz" }
>```

>[!MORELIKETHIS]
>
>* [Alert blocks](#alert-blocks)
>* [Localization macros](#localization-macros)
>* [Badges](#badges)

## Shade boxes

>[!BEGINSHADEBOX "Optional title"]

This content appears with a gray background. Use shade boxes to group related content visually.

You can include lists:

* Item one
* Item two
* Item three

>[!ENDSHADEBOX]

>[!BEGINSHADEBOX]

Shade box without a title.

>[!ENDSHADEBOX]

## Collapsible sections

+++Click to expand — basic example

This content is hidden until the user selects the title.

You can include any content here, including code blocks:

```javascript
const example = 'hello world';
console.log(example);
```

+++

+++Advanced configuration

Use collapsible sections for optional or advanced content that would otherwise clutter the main flow.

| Setting | Value | Description |
| --- | --- | --- |
| timeout | 30 | Seconds before request times out |
| retries | 3 | Number of retry attempts |

{style="table-layout:auto"}

+++

## Embedded video

>[!VIDEO](https://video.tv.adobe.com/v/3427028/?quality=12&learn=on)

## Localization macros

Plain DNL: [!DNL This won't be translated]

Plain UICONTROL: [!UICONTROL MyUiControl]

Bolded: **[!UICONTROL Save]**

Italic: *[!DNL Not Translated]*

## Badges

[!BADGE Beta]{type=Informative}

[!BADGE Generally available]{type=Positive}

[!BADGE Deprecated]{type=Negative}

[!BADGE Experimental]{type=Caution}

## Tabs

>[!BEGINTABS]

>[!TAB Requirements]

>[!IMPORTANT]
>
>You must have Admin permissions to complete this task.

Required fields:

| Field | Type | Required |
| --- | --- | --- |
| Name | String | Yes |
| Email | String | Yes |
| Role | Enum | No |

>[!TAB Steps]

1. Open the Admin console.
1. Select **[!UICONTROL Users]** > **[!UICONTROL Add user]**.
1. Fill in the required fields.
1. Select **[!UICONTROL Save]**.

>[!NOTE]
>
>Changes take effect immediately.

>[!TAB Result]

The new user receives a welcome email with a link to set their password.

* Link expires after 24 hours.
* Users can request a new link from the login page.

>[!ENDTABS]

## Code blocks

```json
{
  "name": "example",
  "version": "1.0.0",
  "enabled": true
}
```

```javascript
function greet(name) {
  return `Hello, ${name}!`;
}
```

## Tables

| Column one | Column two | Column three |
| --- | --- | --- |
| Row 1, cell 1 | Row 1, cell 2 | Row 1, cell 3 |
| Row 2, cell 1 | Row 2, cell 2 | Row 2, cell 3 |

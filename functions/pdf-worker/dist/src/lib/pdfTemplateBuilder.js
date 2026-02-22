"use strict";
/**
 * PDF Template Builder
 *
 * Pure, independently testable functions for building HTML payloads
 * sent to OneSimpleAPI for PDF generation.
 *
 * All functions are side-effect free and do not read environment variables.
 * The caller is responsible for passing siteUrl and other context.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeHtml = escapeHtml;
exports.absolutizeUrl = absolutizeUrl;
exports.replacePlaceholders = replacePlaceholders;
exports.buildRecordHtml = buildRecordHtml;
exports.buildPdfHtml = buildPdfHtml;
exports.parseOneSimpleApiResponse = parseOneSimpleApiResponse;
/**
 * Escapes HTML special characters in a string.
 * Maps: & to &amp;  < to &lt;  > to &gt;  " to &quot;  ' to &#39;
 */
function escapeHtml(str) {
    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    };
    return str.replace(/[&<>"']/g, (match) => escapeMap[match]);
}
/**
 * Ensures a URL is absolute by prepending baseUrl to relative paths.
 * Absolute URLs (starting with http:// or https://) pass through unchanged.
 * Empty strings are returned as-is.
 */
function absolutizeUrl(url, baseUrl) {
    if (!url)
        return url;
    if (url.startsWith('http://') || url.startsWith('https://'))
        return url;
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    return `${baseUrl}/${cleanPath}`;
}
/**
 * Replaces {{placeholder}} tokens in a template string.
 * Also replaces HTML-escaped variants where { becomes &#123; and } becomes &#125;.
 *
 * @param template - The template string containing {{placeholder}} tokens
 * @param placeholders - Map of placeholder keys (e.g. "{{name}}") to replacement values
 */
function replacePlaceholders(template, placeholders) {
    let result = template;
    for (const [placeholder, value] of Object.entries(placeholders)) {
        // Build the HTML-escaped variant of the placeholder
        // e.g. {{name}} becomes &#123;&#123;name&#125;&#125;
        const escapedPlaceholder = placeholder.replace(/[{}]/g, (ch) => ch === '{' ? '&#123;' : '&#125;');
        // Replace normal form using simple string split/join (avoids regex special-char issues)
        result = result.split(placeholder).join(value);
        // Replace HTML-escaped form
        result = result.split(escapedPlaceholder).join(value);
    }
    return result;
}
/**
 * Builds the HTML string for a single attendee record by filling in the record template.
 */
function buildRecordHtml(attendee, eventSettings, customFieldsMap, recordTemplate, siteUrl) {
    const credentialUrl = absolutizeUrl(attendee.credentialUrl || '', siteUrl);
    const photoUrl = absolutizeUrl(attendee.photoUrl || '', siteUrl);
    const placeholders = {
        '{{firstName}}': escapeHtml(attendee.firstName || ''),
        '{{lastName}}': escapeHtml(attendee.lastName || ''),
        '{{barcodeNumber}}': escapeHtml(attendee.barcodeNumber || ''),
        '{{photoUrl}}': photoUrl,
        '{{credentialUrl}}': credentialUrl,
        '{{eventName}}': escapeHtml(eventSettings.eventName || ''),
        '{{eventDate}}': eventSettings.eventDate
            ? new Date(eventSettings.eventDate).toLocaleDateString()
            : '',
        '{{eventTime}}': escapeHtml(eventSettings.eventTime || ''),
        '{{eventLocation}}': escapeHtml(eventSettings.eventLocation || ''),
    };
    // Add custom field placeholders
    const customFieldValues = attendee.customFieldValues
        ? typeof attendee.customFieldValues === 'string'
            ? JSON.parse(attendee.customFieldValues)
            : attendee.customFieldValues
        : {};
    for (const [fieldId, fieldValue] of Object.entries(customFieldValues)) {
        const customField = customFieldsMap.get(fieldId);
        if (customField?.internalFieldName) {
            placeholders[`{{${customField.internalFieldName}}}`] = escapeHtml(String(fieldValue || ''));
        }
    }
    return replacePlaceholders(recordTemplate, placeholders);
}
/**
 * Composes all attendee record HTMLs into the main template.
 * Replaces {{credentialRecords}} and event-level placeholders.
 */
function buildPdfHtml(context) {
    const { attendees, eventSettings, customFieldsMap, recordTemplate, mainTemplate, siteUrl } = context;
    const recordsHtml = attendees
        .map((attendee) => buildRecordHtml(attendee, eventSettings, customFieldsMap, recordTemplate, siteUrl))
        .join('\n');
    const eventPlaceholders = {
        '{{eventName}}': eventSettings.eventName || '',
        '{{eventDate}}': eventSettings.eventDate
            ? new Date(eventSettings.eventDate).toLocaleDateString()
            : '',
        '{{eventTime}}': eventSettings.eventTime || '',
        '{{eventLocation}}': eventSettings.eventLocation || '',
        '{{credentialRecords}}': recordsHtml,
    };
    return replacePlaceholders(mainTemplate, eventPlaceholders);
}
/**
 * Parses a OneSimpleAPI response text.
 *
 * Handles two response formats:
 * 1. JSON with a `url` field: { "url": "https://..." }
 * 2. Plain-text HTTP(S) URL
 *
 * Returns { url } on success or { error } on failure.
 */
function parseOneSimpleApiResponse(responseText) {
    // Try JSON first
    try {
        const parsed = JSON.parse(responseText);
        if (parsed && typeof parsed.url === 'string') {
            return { url: parsed.url };
        }
        return { error: 'missing url field' };
    }
    catch {
        // Not JSON — try plain-text URL
        const trimmed = responseText.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return { url: trimmed };
        }
        return { error: 'not a valid URL' };
    }
}

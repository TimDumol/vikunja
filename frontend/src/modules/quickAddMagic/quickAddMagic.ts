import {REPEAT_TYPES} from '@/types/IRepeatAfter'

import {parseDate} from './dateParser'
import {PREFIXES, PrefixMode} from './prefixes'
import {getItemsFromPrefix, getLabelsFromPrefix, getProjectFromPrefix} from './prefixParser'
import {getPriority} from './priorityParser'
import {getRepeats} from './repeatParser'
import {cleanupItemText, cleanupResult} from './textCleanup'
import type {ParsedTaskText} from './types'

/**
 * Parses task text for dates, assignees, labels, projects, priorities and returns an object with all found intents.
 *
 * @param text
 */
export const parseTaskText = (text: string, prefixesMode: PrefixMode = PrefixMode.Default, now: Date = new Date()): ParsedTaskText => {
	const result: ParsedTaskText = {
		text: text,
		date: null,
		labels: [],
		project: null,
		priority: null,
		assignees: [],
		repeats: null,
	}

	// If the entire text is wrapped in quotes, strip them and skip all parsing
	if (
		text.length >= 2
		&& ((text.startsWith('"') && text.endsWith('"'))
			|| (text.startsWith('\'') && text.endsWith('\'')))
	) {
		result.text = text.slice(1, -1)
		return result
	}

	const prefixes = PREFIXES[prefixesMode]
	if (prefixes === undefined) {
		return result
	}

	result.labels = getLabelsFromPrefix(text, prefixesMode) ?? []
	result.text = cleanupItemText(result.text, result.labels, prefixes.label)

	const projectPrefix = prefixesMode === PrefixMode.Default
		&& getItemsFromPrefix(result.text, '#').length > 0 ? '#' : prefixes.project
	result.project = projectPrefix === '#'
		? getItemsFromPrefix(result.text, '#')[0] ?? null
		: getProjectFromPrefix(result.text, prefixesMode)
	result.text = result.project !== null ? cleanupItemText(result.text, [result.project], projectPrefix) : result.text

	result.priority = getPriority(result.text, prefixes.priority)
	result.text = result.priority !== null ? cleanupItemText(result.text, [String(result.priority)], prefixes.priority) : result.text

	result.assignees = getItemsFromPrefix(result.text, prefixes.assignee)

	const {textWithoutMatched, repeats} = getRepeats(result.text)
	result.text = textWithoutMatched
	result.repeats = repeats

	if (result.repeats === null) {
		const weekdayRepeat = /\b(?:every|each) (monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)\b/i.exec(result.text)
		if (weekdayRepeat !== null) {
			result.text = result.text.replace(weekdayRepeat[0], weekdayRepeat[1])
			result.repeats = {
				amount: 1,
				type: REPEAT_TYPES.Weeks,
			}
		}
	}

	const {newText, date} = parseDate(result.text, now)
	result.text = newText
	result.date = date

	return cleanupResult(result, {
		...prefixes,
		project: projectPrefix,
	})
}

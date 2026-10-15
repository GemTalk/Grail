"``warnings._deprecated' -- the stdlib's own removal announcer.

Private by name, but stdlib modules CALL it, so vendoring those modules means
providing it.  wave.py calls it from five methods, and every one of those
test_wave tests errored with ``module has no attribute '_deprecated''.

Two behaviours, and the second is the one that gets left out.  Ordinarily it
emits a DeprecationWarning whose text comes from formatting the message with
the name and the removal version rendered as ``3.15'.  But when the running
interpreter is already PAST that version it raises RuntimeError instead -- a
guard for the release process, fired when someone forgets to delete the thing,
not something a caller normally reaches.

The Smalltalk side had to reach sys through ``(Python at: #sys)
___instance___': the bare name ``sys' is the module CLASS, and version_info
lives on its singleton.

See tests/python/warnings_deprecated.py."
Class {
	#name : 'WarningsDeprecatedTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
WarningsDeprecatedTestCase >> assertAll: keys [
	"Assert every named check passed, naming the failing one."

	keys do: [:each |
		self assert: (self resultAt: each) equals: true]

]

{ #category : 'Grail-Helpers' }
WarningsDeprecatedTestCase >> resultAt: aKey [
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
WarningsDeprecatedTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'warnings_deprecated' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warnings_deprecated.py')
		name: 'warnings_deprecated'.

]

{ #category : 'Grail-Tests' }
WarningsDeprecatedTestCase >> testArgumentHandling [
	"``remove'' is keyword-only and required; so is ``name''."

	self assertAll: #('remove_is_keyword_only' 'remove_is_required'
		'name_is_required')

]

{ #category : 'Grail-Tests' }
WarningsDeprecatedTestCase >> testCustomMessageIsFormatted [
	"A caller-supplied message takes the same two fields, in plain and repr
	form, and one using neither passes through untouched."

	self assertAll: #('custom_message_fills_name_and_remove'
		'custom_message_supports_repr_field'
		'custom_message_without_fields')

]

{ #category : 'Grail-Tests' }
WarningsDeprecatedTestCase >> testDefaultMessageIsFormatted [
	"The name is quoted, the version tuple is rendered M.m, and neither the
	raw tuple nor an unfilled brace survives into the text."

	self assertAll: #('default_message_quotes_the_name'
		'default_message_formats_remove_as_dotted'
		'default_message_has_no_raw_tuple'
		'default_message_has_no_unfilled_field')

]

{ #category : 'Grail-Tests' }
WarningsDeprecatedTestCase >> testEmitsADeprecationWarning [
	"The ordinary path: a warning of the right category."

	self assertAll: #('emits_deprecation_warning')

]

{ #category : 'Grail-Tests' }
WarningsDeprecatedTestCase >> testPastRemovalVersionRaises [
	"The release-process guard: past the announced version this is a
	RuntimeError, not a warning, and the message says what outlived what."

	self assertAll: #('past_removal_version_raises'
		'past_removal_message_names_the_thing'
		'past_removal_message_names_the_version')

]

{ #category : 'Grail-Tests' }
WarningsDeprecatedTestCase >> testTheShapeWaveUses [
	"Exactly the call vendored wave.py makes, at a version that has not
	arrived -- the case that motivated the whole method."

	self assertAll: #('wave_style_call_warns'
		'wave_style_call_names_the_method')

]

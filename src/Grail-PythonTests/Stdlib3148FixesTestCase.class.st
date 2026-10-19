"CPython 3.14.8 fixes ported by hand into stdlib modules Grail rewrites
rather than vendors: subprocess.CalledProcessError text, logging
removeHandler copy-on-write, isinstance against an ABC without __class__,
warn_explicit with __main__ globals, configparser line-ending folding, the
http.client interim-response and trailer bounds, and http.cookies js_output
percent-encoding.

Every expectation in tests/python/stdlib_3148_fixes.py was produced by
CPython 3.14.8; the fixture gate re-checks it there."
Class {
	#name : 'Stdlib3148FixesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
Stdlib3148FixesTestCase >> assertAll: keys [
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]

]

{ #category : 'Grail-Helpers' }
Stdlib3148FixesTestCase >> resultAt: aKey [
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
Stdlib3148FixesTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'stdlib_3148_fixes' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/stdlib_3148_fixes.py')
		name: 'stdlib_3148_fixes'.

]

{ #category : 'Grail-Tests' }
Stdlib3148FixesTestCase >> testConfigparserAndHttp [
	self assertAll: #('configparser_folds_every_line_ending'
		'http_client_bounds_interim_responses'
		'http_client_bounds_trailers'
		'cookie_js_output_is_percent_encoded')

]

{ #category : 'Grail-Tests' }
Stdlib3148FixesTestCase >> testProcessLoggingAndAbc [
	self assertAll: #('called_process_error_text'
		'a_handler_removing_itself_spares_the_next'
		'isinstance_without_a_class_attribute'
		'warn_explicit_with_main_globals')

]

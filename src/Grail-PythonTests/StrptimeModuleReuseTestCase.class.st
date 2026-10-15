Class {
	#name : 'StrptimeModuleReuseTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
StrptimeModuleReuseTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
StrptimeModuleReuseTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #strptime_module_reuse ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/strptime_module_reuse.py')
		name: 'strptime_module_reuse'.

]

{ #category : 'Grail-Tests' }
StrptimeModuleReuseTestCase >> testAnExplicitImportIsTheSameModule [
	"``import _strptime'' and the strptime methods share one module, so what
	it caches -- the TimeRE and the per-format regexes -- survives a call."

	#('import_and_methods_share_it' 'time_re_cache_kept' 'regex_cache_kept')
		do: [:key | self assertMatchesCPythonAt: key].

]

{ #category : 'Grail-Tests' }
StrptimeModuleReuseTestCase >> testEachStrptimeKeepsTheSameModule [
	"The headline: two calls in a row leave the same _strptime in sys.modules,
	for each of the four entry points."

	#('datetime_strptime' 'date_strptime' 'time_class_strptime'
	  'time_module_strptime')
		do: [:key | self assertMatchesCPythonAt: key].

]

{ #category : 'Grail-Tests - Controls' }
StrptimeModuleReuseTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check would stop being
	asserted and nothing would go red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '9 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Controls' }
StrptimeModuleReuseTestCase >> testRuntimeModuleRefusesAMissingModule [
	"The helper's miss: no file on the search path is an ImportError, not nil
	-- nil would surface later as an MNU far from the cause."

	| raised |
	raised := false.
	[importlib @env1:___runtimeModule___: 'grail_no_such_module_1222']
		on: ImportError
		do: [:ex | raised := true. ex return: nil].
	self assert: raised

]

{ #category : 'Grail-Tests - Controls' }
StrptimeModuleReuseTestCase >> testTheAnswersAreUnchanged [
	"Parsed values and the mismatch error are what they were."

	self assertMatchesCPythonAt: 'values'.
	self assertMatchesCPythonAt: 'error_is_unchanged'.

]

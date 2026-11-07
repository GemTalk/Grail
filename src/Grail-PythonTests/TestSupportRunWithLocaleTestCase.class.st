Class {
	#name : 'TestSupportRunWithLocaleTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TestSupportRunWithLocaleTestCase >> testRunWithLocaleSetsALocaleForABlockAndStillDecorates [

	"tests/python/test_support_run_with_locale.py: test.support.run_with_locale
	sets a locale for a with block, still decorates a test, skips one when no
	locale it names can be set, and skip_if_buggy_ucrt_strfptime leaves a test
	alone off Windows.  Each check agrees with CPython 3.14's test.support."

	| fixture |

	importlib @env1:modules removeKey: #'test_support_run_with_locale' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/test_support_run_with_locale.py')
		name: 'test_support_run_with_locale'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]

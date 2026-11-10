Class {
	#name : 'UnicodeEscapeWarnsAboutWhatItDecodedTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnicodeEscapeWarnsAboutWhatItDecodedTestCase >> testTheWarningIsAboutTheInputTheHandlerLeft [

	"tests/python/unicode_escape_warns_about_what_it_decoded.py:
	codecs.unicode_escape_decode warns about the first invalid escape it
	really decoded, in the input a registered handler replaced as it went.
	Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'unicode_escape_warns_about_what_it_decoded' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unicode_escape_warns_about_what_it_decoded.py')
		name: 'unicode_escape_warns_about_what_it_decoded'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]

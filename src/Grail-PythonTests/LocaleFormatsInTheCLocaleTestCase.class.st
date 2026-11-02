Class {
	#name : 'LocaleFormatsInTheCLocaleTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
LocaleFormatsInTheCLocaleTestCase >> testLocaleFormatsAndReadsNumbersAsTheCLocaleDoes [
	"tests/python/locale_formats_in_the_c_locale.py: format_string, atof,
	atoi, str, delocalize, localize, currency and normalize answer as they do
	in the C locale, where format_string is format()'s 'n'.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'locale_formats_in_the_c_locale' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/locale_formats_in_the_c_locale.py')
		name: 'locale_formats_in_the_c_locale'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'

]

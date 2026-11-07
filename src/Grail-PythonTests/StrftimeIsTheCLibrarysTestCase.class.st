Class {
	#name : 'StrftimeIsTheCLibrarysTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StrftimeIsTheCLibrarysTestCase >> testTimeStrftimeAnswersEveryDirectiveAsTheCLibraryDoes [

	"tests/python/strftime_is_the_c_librarys.py: time.strftime answers every
	directive Darwin's and glibc's strftime(3) agree on, refuses a time tuple
	and its fields as gettmarg and checktm do, keeps what is not ASCII, and
	datetime still pads a year before 1000.  Each check agrees with CPython
	3.14."

	| fixture |

	importlib @env1:modules removeKey: #'strftime_is_the_c_librarys' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/strftime_is_the_c_librarys.py')
		name: 'strftime_is_the_c_librarys'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]

"The io classes answer CPython's __module__, ``_io''.  They had none, so
test.support.check__all__ -- which asks it of every name a module holds --
counted plistlib's imported BytesIO as plistlib's own public API
(test_plistlib test__all__)."
Class {
	#name : 'IoClassModuleTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
IoClassModuleTestCase >> testTheIoClassesComeFromUnderscoreIo [

	self
		assert: (self eval: 'import io
[c.__module__ for c in (io.BytesIO, io.StringIO, io.TextIOWrapper, io.FileIO)] == [''_io''] * 4')
		equals: true

]

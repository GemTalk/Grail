! ------------------- Remove existing behavior from PyObject
expectvalue /Metaclass3       
doit
PyObject removeAllMethods.
PyObject class removeAllMethods.
%
! ------------------- Class methods for PyObject
set compile_env: 0
category: 'other'
classmethod: PyObject
new: aClassDefAst

	^self basicNew
		initialize: aClassDefAst;
		yourself
%
! ------------------- Instance methods for PyObject
set compile_env: 0
category: 'other'
method: PyObject
__str__
	"<__main__.MyClass object at 0x7fe9d8210400>"

	^(WriteStream on: PyString new)
		nextPut: $<;
		nextPutAll: classAst module name;
		nextPut: $.;
		nextPutAll: classAst name;
		nextPutAll: ' object at 0x';
		nextPutAll: (self asOop printStringRadix: 16);
		nextPut: $>;
		contents
%
category: 'other'
method: PyObject
associationAt: aSymbol

	^variables 
		associationAt: aSymbol
		ifAbsent: [ | assoc |
			assoc := classAst associationAt: aSymbol otherwise: nil.
			assoc ifNil: [
				assoc := SymbolAssociation newWithKey: aSymbol value: _remoteNil.
				variables addAssociation: assoc.
				assoc]]
%
category: 'other'
method: PyObject
call: aSymbol withArguments: anArray keywords: aSymbolDictionary

	| assoc |
	assoc := variables associationAt: aSymbol ifAbsent: [
		classAst associationAt: aSymbol otherwise: nil.
	].
	assoc ifNil: [self error: 'method not found!'].
	^assoc value
		callFromObject: self
		arguments: anArray
		keywords: aSymbolDictionary
%
category: 'other'
method: PyObject
classAst

	^classAst
%
category: 'other'
method: PyObject
initialize: aClassDefAst

	classAst := aClassDefAst.
	variables := SymbolDictionary new.
%

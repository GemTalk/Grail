! ------------------- Remove existing behavior from function
expectvalue /Metaclass3       
doit
function removeAllMethods.
function class removeAllMethods.
%
! ------------------- Class methods for function
set compile_env: 0
category: 'other'
classmethod: function
newForNode: aFunctionDefAst scope: aScope

	^self basicNew
		initializeNode: aFunctionDefAst scope: aScope;
		yourself
%
! ------------------- Instance methods for function
set compile_env: 0
category: 'other'
method: function
get: aSymbol

	| attributes |
	attributes := Namespace new
		set: #'__annotations__'	to: nil;
		set: #'__closure__'			to: nil;
		set: #'__code__'				to: nil;
		set: #'__defaults__'			to: nil;
		set: #'__dict__'				to: scope;
		set: #'__doc__'				to: nil;
		set: #'__globals__'			to: scope globals;
		set: #'__kwdefaults__'		to: nil;
		set: #'__module__'			to: astNode module;
		set: #'__name__'				to: astNode name;
		set: #'__qualname__'		to: nil;
		yourself.

	attributes halt.
%
category: 'other'
method: function
initializeNode: aFunctionDefAst scope: aScope
	"https://docs.python.org/3/reference/datamodel.html"

	astNode := aFunctionDefAst.
	scope := aScope.
%
category: 'other'
method: function
printOn: aStream

	super printOn: aStream.
	aStream nextPut: $-.
	astNode printOn: aStream.
%
category: 'other'
method: function
value: arguments value: keywords value: aScope

	^astNode
		value: arguments
		value: keywords
		value: scope copy
%
set compile_env: 0
category: 'Python'
method: function
__annotations__

	self halt.
%
category: 'Python'
method: function
__call__

	self halt.
%
category: 'Python'
method: function
__closure__

	self halt.
%
category: 'Python'
method: function
__defaults__

	self halt.
%
category: 'Python'
method: function
__delattr__

	self halt.
%
category: 'Python'
method: function
__dict__

	self halt.
%
category: 'Python'
method: function
__get__

	self halt.
%
category: 'Python'
method: function
__globals__

	self halt.
%
category: 'Python'
method: function
__kwdefaults__

	self halt.
%
category: 'Python'
method: function
__module__

	self halt.
%
category: 'Python'
method: function
__name__

	self halt.
%
category: 'Python'
method: function
__qualname__

	self halt.
%
category: 'Python'
method: function
__str__

	self halt.
%
category: 'Python'
method: function
__subclasshook__

	self halt.
%

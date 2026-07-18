! ------------------- Superclass check
run
AbstractNode ifNil: [self error: 'AbstractNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for ArgumentsAst
expectvalue /Class
doit
AbstractNode subclass: 'ArgumentsAst'
  instVarNames: #( posonlyargs args vararg
                    kwonlyargs kw_defaults kwarg defaults)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ArgumentsAst comment: 
'arguments = (arg* posonlyargs, arg* args, arg? vararg, arg* kwonlyargs,
                 expr* kw_defaults, arg? kwarg, expr* defaults)'
%

expectvalue /Class
doit
ArgumentsAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ArgumentsAst
removeallmethods ArgumentsAst
removeallclassmethods ArgumentsAst

set compile_env: 0

category: 'Grail-other'
method: ArgumentsAst
args

	^args
%

category: 'Grail-other'
method: ArgumentsAst
defaults

	^defaults
%

category: 'Grail-other'
method: ArgumentsAst
appendDefault: aNode
	"Append a synthetic trailing default expression.  Used by the
	bigmemtest decorator shim (FunctionDefAst>>applyBigmemtestDefaultIfNeeded)
	to give a required trailing parameter a dry-run default, so a stock
	CPython ``@bigmemtest''-decorated test method — whose decorator Grail
	drops — is still callable with no arguments.  Copies into an
	OrderedCollection first: the parser stores ``defaults'' as a fixed
	Array (``Array new'' when the def has no defaults), which cannot grow."
	defaults := defaults isNil
		ifTrue: [OrderedCollection new]
		ifFalse: [OrderedCollection withAll: defaults].
	defaults add: aNode.
%

category: 'Grail-other'
method: ArgumentsAst
kw_defaults

	^kw_defaults
%

category: 'Grail-other'
method: ArgumentsAst
kwarg

	^kwarg
%

category: 'Grail-other'
method: ArgumentsAst
kwonlyargs

	^kwonlyargs
%

category: 'Grail-other'
method: ArgumentsAst
posonlyargs

	^posonlyargs
%

category: 'Grail-other'
method: ArgumentsAst
vararg

	^vararg
%

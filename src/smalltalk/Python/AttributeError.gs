! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- AttributeError
expectvalue /Class
doit
Exception subclass: 'AttributeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
AttributeError category: 'Exceptions'
%

! ------------------- Helpers used by codegen for unset-instVar checks
set compile_env: 0

category: 'Unset-Attr Check'
classmethod: AttributeError
___checkAttr: aValue ofObject: anObject named: aSymbol
	"Codegen helper: return ``aValue`` unchanged if it is not Smalltalk nil,
	otherwise raise AttributeError naming the receiver's class and the
	attribute. Emitted by AttributeAst's load-context codegen for
	``self.X`` reads in Phase 5c class methods. The ``nil = unset``
	invariant follows from the same singleton-None / Phase D work that
	makes the local variable check correct."

	aValue == nil ifTrue: [
		^ self @env1:___signal___:
			('''' , (anObject @env0:class @env0:name @env0:asString) ,
			 ''' object has no attribute ''' , aSymbol @env0:asString , '''')
	].
	^ aValue
%

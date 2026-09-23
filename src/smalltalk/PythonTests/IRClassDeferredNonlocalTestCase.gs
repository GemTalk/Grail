! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IRClassDeferredNonlocalTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IRClassDeferredNonlocalTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IRClassDeferredNonlocalTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IRClassDeferredNonlocalTestCase
!
! A CLASS BODY'S ``nonlocal'' NAME, READ LATER, INSIDE AN IR-BUILT DEF.
!
! A class statement inside an IR-built def runs as a compiled-text helper, and
! a carried ``nonlocal'' name reaches it as a reader block, which methods call
! -- by reference, correctly.  The helper ALSO copies the name into a temp once
! on entry, for the reads a class makes eagerly.  Class-level code that runs
! LATER read that copy: a lambda, a lazy generator expression, and since PEP 649
! every annotation.  Measured under IR before the fix:
!
!   x = 1; class C: nonlocal x; grab = lambda: x      then x = 5
!       CPython and text: C.grab() == 5          IR: 1
!   a name bound only after the class                IR: UnboundLocalError
!   test_annotationlib's nonlocal-in-class ForwardRef IR: NameError
!
! The fix refuses that shape (``classDef:deferredReadOfNonlocal''), so the def
! compiles as text.  The WHICH-PATH test is the positive control that the
! refusal is narrow: a class that declares ``nonlocal'' but reads nothing late
! must still be IR-built, or the fix would pass by refusing everything.
!
! FORCED: the text path is right, so a flag-off run exercises none of this.
! ===============================================================================

doit
IRClassDeferredNonlocalTestCase removeAllMethods.
IRClassDeferredNonlocalTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: IRClassDeferredNonlocalTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'icdn_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'icdn_ir'.
	irModule := nil
%

category: 'Grail-Private'
method: IRClassDeferredNonlocalTestCase
___irModule___
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'icdn_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'icdn_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	irModule := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/ir_class_deferred_nonlocal.py'
		name: 'icdn_ir'.
	^ irModule
%

category: 'Grail-Private'
method: IRClassDeferredNonlocalTestCase
___isIRBuilt___: aSelector
	| meth |
	meth := self ___irModule___ class compiledMethodAt: aSelector environmentId: 1
		otherwise: nil.
	self assert: meth notNil description: 'no method for ' , aSelector printString.
	^ BaseException ___isIRPythonMethod___: meth
%

category: 'Grail-Private'
method: IRClassDeferredNonlocalTestCase
___got___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey) asString
%

category: 'Grail-Private'
method: IRClassDeferredNonlocalTestCase
___want___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED') @env1:__getitem__: aKey) asString
%

category: 'Grail-Tests - deferred reads of a class body nonlocal'
method: IRClassDeferredNonlocalTestCase
testALateReadSeesTheBindingAtReadTime
	"Each of these reads the name AFTER the class statement ran; each saw the
	helper's copy from that moment instead of the binding."

	#('lambda_after_enclosing_changes' 'lambda_bound_only_after'
	  'genexp_after_enclosing_changes' 'annotation_forward_ref') do: [:k |
		self assert: (self ___got___: k) = (self ___want___: k)
			description: k , ' answered ' , (self ___got___: k) , ', not '
				, (self ___want___: k)]
%

category: 'Grail-Tests - deferred reads of a class body nonlocal'
method: IRClassDeferredNonlocalTestCase
testTheRefusalIsNarrow
	"The positive control.  A class that declares ``nonlocal'' and reads it only
	eagerly has nothing to fear from the copy, and must stay on the IR path;
	each shape that reads it late must not be on it."

	self assert: (self ___isIRBuilt___: #write_then_read)
		description: 'write_then_read fell back to text: the refusal is too broad'.
	self assert: (self ___got___: 'write_then_read') = (self ___want___: 'write_then_read')
		description: 'write_then_read answered ' , (self ___got___: 'write_then_read').
	#(#lambda_after_enclosing_changes #lambda_bound_only_after
	  #genexp_after_enclosing_changes #annotation_forward_ref) do: [:sel |
		self deny: (self ___isIRBuilt___: sel)
			description: sel , ' was IR-built despite a late read of its nonlocal']
%

category: 'Grail-Tests - deferred reads of a class body nonlocal'
method: IRClassDeferredNonlocalTestCase
testEveryCheckAgreesWithCPythonUnderIR
	self
		assert: (self ___irModule___ @env1:___pyAttrLoad___: #'SUMMARY') asString
		equals: '5 checks, 0 disagreeing [], keys match: True'
%

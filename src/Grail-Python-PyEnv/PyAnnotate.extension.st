Extension { #name : 'PyAnnotate' }

{ #category : 'Grail-Annotations' }
PyAnnotate class >> ___annotationValue___: aBlock source: aString format: aFormat [
	"ONE annotation, rendered in one of PEP 649's formats.  The annotate
	functions FunctionDefAst emits call this per annotated parameter, and
	per return annotation.

	aBlock evaluates the annotation EXPRESSION in the def's enclosing
	scope; aString is the same expression's source text, computed at
	codegen by ___annotationSourceString___.

	  Format.VALUE (1)      evaluate.  A name bound nowhere raises
	                        NameError, which is what CPython reports for
	                        ``def f() -> nonexistent'' when the
	                        annotations are read.
	  Format.STRING (4)     the source text, never evaluated -- so this
	                        format works for any annotation at all.
	  Format.FORWARDREF (3) evaluate, but a failed evaluation yields the
	                        marker ``('__grail_forwardref__', source,
	                        block)'' rather than raising.  The block rides
	                        along as the ForwardRef's evaluator -- Grail's
	                        stand-in for CPython's __cell__, so a closure
	                        variable bound after the def still resolves.  annotationlib.get_annotations
	                        turns each marker into a ForwardRef; doing the
	                        substitution THERE keeps ForwardRef a plain
	                        Python class and keeps this method from having
	                        to build Python objects from Smalltalk.

	Evaluating per-annotation rather than per-dict is what gives
	FORWARDREF its per-KEY granularity: ``def f(a: int) -> nonexistent''
	must answer a resolved ``int'' alongside a ForwardRef for the return,
	which a single dict-building block that raised partway could not do."

	| fmt |
	"THE FORMAT IS NORMALISED THROUGH __index__ FIRST.  annotationlib's Format is
	 an IntEnum, as CPython's is, and a member is a Python int SUBCLASS instance:
	 the Smalltalk ``='' below compares it with 4 as an object and answers false,
	 so an unnormalised Format.STRING fell through every test and was EVALUATED
	 -- answering values where the caller asked for source text.  __index__
	 yields the plain integer for a member and for an int alike."
	fmt := [aFormat @env1:__index__] @env0:on: AbstractException
		do: [:ex | ex @env0:return: aFormat].
	fmt @env0:= 4 ifTrue: [^ aString].
	fmt @env0:= 3 ifTrue: [
		"ANY Python exception, not only NameError: CPython's FORWARDREF answers a
		 ForwardRef for an annotation whose evaluation fails for any reason --
		 ``obj.missing'' (AttributeError), ``1 + int'' (TypeError) -- because its
		 fake globals turn every name, closure cells included, into a stringifier
		 that cannot fail.  Catching NameError alone let the others escape
		 (test_annotationlib test_partial_evaluation_cell)."
		^ [aBlock @env0:value]
			@env0:on: (Python @env0:at: #'Exception')
			do: [:ex |
				ex @env0:return:
					(tuple @env0:withAll:
						{ '__grail_forwardref__' . aString .
							"The def-closure shape, so Python can CALL it: a bare
							 zero-argument block is not a Python callable."
							[:positional :kwargs | aBlock @env0:value] })]].
	"VALUE (1) and VALUE_WITH_FAKE_GLOBALS (2) both evaluate -- CPython's
	 generated annotate treats them alike.  Anything else is refused the way
	 CPython's generated annotate refuses it, with NotImplementedError; that is
	 what lets annotationlib.call_annotate_function answer CPython's
	 ``ValueError: Invalid format'' for, say, 42, where evaluating it as VALUE
	 hid the bad argument entirely."
	((fmt @env0:= 1) @env0:or: [fmt @env0:= 2]) ifFalse: [
		^ NotImplementedError ___signal___: ''].
	^ aBlock @env0:value

]

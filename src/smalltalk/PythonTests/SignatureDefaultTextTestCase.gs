! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SignatureDefaultTextTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SignatureDefaultTextTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SignatureDefaultTextTestCase - inspect.signature must render defaults as
! Python source, not as annotation text.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SignatureDefaultTextTestCase removeAllMethods.
SignatureDefaultTextTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Introspection'
method: SignatureDefaultTextTestCase
testSignatureDefaultText
	"Grail has no code object, so FunctionDefAst stamps ``__signature_spec__''
	carrying each default's SOURCE TEXT -- and that text came from the
	ANNOTATIONS unparser, whose assumptions hold for annotations and not for
	defaults.  Four separate defects, all in one shared helper:

	  * every binary operator became the PEP 604 union bar: ``1+1'' rendered
	    ``1 | 1'', as did ``3-1'', ``2*3'', ``7/2'', ``5%2'', ``2**3'', ``1&3'',
	    ``1^2'' and ``1<<2''.  The unparser hardcoded `` | '' and said why --
	    ``the exact operator glyph is not load-bearing'' -- which was TRUE while
	    annotations were its only caller.

	  * a string literal lost its quotes, because an annotation's string is a
	    forward reference whose content IS the name: ``'abc'' -> ``abc'', and the
	    empty string -> nothing at all after the equals sign.

	  * a tuple rendered BARE, changing the signature's apparent ARITY:
	    ``def f(j=(1,2))'' printed ``(j=1, 2)'', which reads as two parameters.

	  * unary minus, lists and dicts fell to the ``<annotation>'' placeholder.

	Defaults now have ___defaultSourceString___, which delegates to the
	annotation form only where the two agree.
	``the_annotation_forms_are_unchanged'' is the guard rail that matters: the
	annotation path NEEDS the union bar and the bare forward reference, so a fix
	that ``corrected'' those would break PEP 604 and PEP 563.

	A COMPUTED default still renders as source text rather than its value
	(``1+1'' -> ``1 + 1'' where CPython prints ``2''); see inspect._DefaultText
	for why, and note that closing it needs ``__defaults__'', which Grail does
	not expose.  These twelve checks cover LITERAL defaults, where Grail and
	CPython now agree exactly, and all twelve answer identically under real
	CPython 3.14.6.  See tests/python/signature_default_text.py."

	| mod |
	importlib @env1:modules removeKey: #'signature_default_text' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/signature_default_text.py')
		name: 'signature_default_text'.
	#( 'a_string_default_keeps_its_quotes'
	   'an_empty_string_default_is_visible'
	   'a_string_containing_a_quote_uses_double_quotes'
	   'a_negative_number_default_renders'
	   'a_list_default_renders'
	   'an_empty_list_default_renders'
	   'a_dict_default_renders'
	   'a_tuple_default_keeps_its_parentheses'
	   'a_one_tuple_default_keeps_its_trailing_comma'
	   'nested_literal_defaults_render'
	   'the_plain_literals_still_render'
	   'the_annotation_forms_are_unchanged' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'signature default text check failed: ' , k]
%

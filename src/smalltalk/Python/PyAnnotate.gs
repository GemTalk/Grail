! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- PyAnnotate class (PEP 649 annotation protocol -- func.__annotate__)
expectvalue /Class
doit
object subclass: 'PyAnnotate'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyAnnotate comment:
'Runtime support for PEP 649 / PEP 749 annotations.

An annotated ``def`` does not store its annotations; it stores an
``__annotate__`` FUNCTION, built at def-time by FunctionDefAst, that takes an
``annotationlib.Format`` and answers the annotation dict.  Reading
``func.__annotations__`` calls it with ``Format.VALUE``.

Deferring the evaluation this way is what lets an annotation name something
that is not bound yet.  Grail previously stored annotations as PEP 563 source
STRINGS for exactly that reason -- 55+ werkzeug/flask modules annotate
parameters with forward references, and evaluating at def-time raised NameError
and aborted the module load -- but strings made ``f.__annotations__`` answer
``{''a'': ''int''}`` where CPython 3.14 answers ``{''a'': int}``, and left
``__annotate__`` with nothing to be.

This class exists to hold ___annotationValue___:source:format:, which the
emitted annotate functions call once per annotation.  It has to live in the
``Python`` symbol dictionary rather than on ExecBlock (its natural home, since
an annotate function IS an ExecBlock): generated module code is compiled
against a dictionary list that does not include the kernel ``Globals``, so a
reference to ``ExecBlock`` is an undefined symbol at compile time.
'
%

expectvalue /Class
doit
PyAnnotate category: 'Grail-Annotations'
%

set compile_env: 0

expectvalue /Metaclass3
doit
PyAnnotate removeAllMethods.
PyAnnotate class removeAllMethods.
%

set compile_env: 1

category: 'Grail-Annotations'
classmethod: PyAnnotate
___annotationValue___: aBlock source: aString format: aFormat
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
	  Format.FORWARDREF (3) evaluate, but an unresolvable name yields the
	                        two-element marker
	                        ``('__grail_forwardref__', source)'' rather
	                        than raising.  annotationlib.get_annotations
	                        turns each marker into a ForwardRef; doing the
	                        substitution THERE keeps ForwardRef a plain
	                        Python class and keeps this method from having
	                        to build Python objects from Smalltalk.

	Evaluating per-annotation rather than per-dict is what gives
	FORWARDREF its per-KEY granularity: ``def f(a: int) -> nonexistent''
	must answer a resolved ``int'' alongside a ForwardRef for the return,
	which a single dict-building block that raised partway could not do."

	aFormat @env0:= 4 ifTrue: [^ aString].
	aFormat @env0:= 3 ifTrue: [
		^ [aBlock @env0:value]
			@env0:on: NameError
			do: [:ex |
				ex @env0:return:
					(tuple @env0:withAll:
						{ '__grail_forwardref__' . aString })]].
	^ aBlock @env0:value
%

! Leave the compiler in env 0: the next file filed by install.gs opens with a
! class-definition doit, which only ``Object class'' understands in env 0.
set compile_env: 0

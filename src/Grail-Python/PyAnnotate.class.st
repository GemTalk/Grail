"Runtime support for PEP 649 / PEP 749 annotations.

An annotated ``def`` does not store its annotations; it stores an
``__annotate__`` FUNCTION, built at def-time by FunctionDefAst, that takes an
``annotationlib.Format`` and answers the annotation dict.  Reading
``func.__annotations__`` calls it with ``Format.VALUE``.

Deferring the evaluation this way is what lets an annotation name something
that is not bound yet.  Grail previously stored annotations as PEP 563 source
STRINGS for exactly that reason -- 55+ werkzeug/flask modules annotate
parameters with forward references, and evaluating at def-time raised NameError
and aborted the module load -- but strings made ``f.__annotations__`` answer
``{'a': 'int'}`` where CPython 3.14 answers ``{'a': int}``, and left
``__annotate__`` with nothing to be.

This class exists to hold ___annotationValue___:source:format:, which the
emitted annotate functions call once per annotation.  It has to live in the
``Python`` symbol dictionary rather than on ExecBlock (its natural home, since
an annotate function IS an ExecBlock): generated module code is compiled
against a dictionary list that does not include the kernel ``Globals``, so a
reference to ``ExecBlock`` is an undefined symbol at compile time.

"
Class {
	#name : 'PyAnnotate',
	#superclass : 'object',
	#category : 'Grail-Annotations'
}

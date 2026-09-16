## Progress — cut 43 (positional-only parameters in the varargs form)

The last signature shape; `___irSignatureReason___` now judges only the
default expressions.  A positional-only parameter (PEP 570) is not
keyword-bindable, which changes three places, each the text's:

* its binding has no kwargs gate: `a := (positional size >= 1) ifTrue:
  [positional at: 1] ifFalse: [<default or raise>]`;
* the missing-positional check passes `posonly: N` (the leading positional-only
  parameters among the required ones) so the runtime check does not credit a
  keyword of that name;
* the unexpected-keyword guard becomes the collecting form: every keyword that
  names a positional-only parameter goes to `___po___` (in PARAMETER order),
  the first plainly unknown one to `___unk___`, and the positional-only report
  outranks the unknown one, as CPython's format_kwargs_error does -- `f() got
  some positional-only arguments passed as keyword arguments: 'a, b'`, joined
  by `inject:into:` over a two-argument block.  The text wraps this in an
  immediately-evaluated `[ | ___po___ ___unk___ | ... ] value` only to declare
  the two temps mid-method; here they are method temps and the statements sit
  in the guard's `ifTrue:` block directly -- the same sends in the same order.

Two builder additions: `orValue:then:` (inlined `or:`, COMPAR_OR_SELECTOR) and
`blockWithArgs:do:` (a block with several arguments, for the `inject:into:`).

Fixture: pos_only (`a, /, b=2`), pos_only_kw (positional-only names surviving
into **rest), pos_only_calls, pos_only_errors (the posonly report from a lone
keyword and from a keyword mixed with an unknown one, the unknown-only case,
and the missing case); compiled 159 -> 163.

Cut 43 flag-on sweep: the known families plus two `AlmostOutOfMemory` ERRORs
(`SmalltalkForwarderTestCase>>testKeywordSelectorTwoArgs`,
`ZipfileTestCase>>testOpenStreamsInSmallReads`) -- the pressure effect.

With cuts 40-43 the whole signature grammar -- defaults, `*args`, `**kwargs`,
keyword-only, positional-only -- compiles through IR at the module-def seam;
`___irSignatureReason___` refuses only a default expression it cannot emit.

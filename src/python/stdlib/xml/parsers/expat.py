# GRAIL: CPython 3.14.7's xml/parsers/expat.py, VERBATIM.  It is a four-line
# re-export of the pyexpat extension -- and Grail's pyexpat is pure Python,
# so this file needs no change at all to point at it.
"""Interface to the Expat non-validating XML parser."""
import sys

from pyexpat import *

# provide pyexpat submodules as xml.parsers.expat submodules
sys.modules['xml.parsers.expat.model'] = model
sys.modules['xml.parsers.expat.errors'] = errors

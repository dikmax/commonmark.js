"use strict";

var escapeXml = require('./common').escapeXml;

// Helper function to produce an HTML tag.
var tag = function(name, attrs, selfclosing) {
    var result = '<' + name;
    if (attrs && attrs.length > 0) {
        var i = 0;
        var attrib;
        while ((attrib = attrs[i]) !== undefined) {
            result = result.concat(' ', attrib[0], '="', attrib[1], '"');
            i++;
        }
    }
    if (selfclosing) {
        result += ' /';
    }

    result += '>';
    return result;
};

var reHtmlTag = /\<[^>]*\>/;

var renderNodes = function(block) {

    var attrs;
    var info_words;
    var tagname;
    var walker = block.walker();
    var event, node, entering;
    var buffer = "";
    var lastOut = "\n";
    var disableTags = 0;
    var grandparent;
    var out = function(s) {
        if (disableTags > 0) {
            buffer += s.replace(reHtmlTag, '');
        } else {
            buffer += s;
        }
        lastOut = s;
    };
    var esc = this.escape;
    var cr = function() {
        if (lastOut !== '\n') {
            buffer += '\n';
            lastOut = '\n';
        }
    };

    var options = this.options;

    if (options.time) { console.time("rendering"); }

    while ((event = walker.next())) {
        entering = event.entering;
        node = event.node;

        attrs = [];
        if (options.sourcepos) {
            var pos = node.sourcepos;
            if (pos) {
                attrs.push(['data-sourcepos', String(pos[0][0]) + ':' +
                            String(pos[0][1]) + '-' + String(pos[1][0]) + ':' +
                            String(pos[1][1])]);
            }
        }

        switch (node.t) {
        case 'Text':
            out(esc(node.literal));
            break;

        case 'Softbreak':
            out(this.softbreak);
            break;

        case 'Hardbreak':
            out(tag('br', [], true));
            cr();
            break;

        case 'Emph':
            out(tag(entering ? 'em' : '/em'));
            break;

        case 'Strong':
            out(tag(entering ? 'strong' : '/strong'));
            break;

        case 'Html':
            out(node.literal);
            break;

        case 'Link':
            if (entering) {
                attrs.push(['href', esc(node.destination, true)]);
                if (node.title) {
                    attrs.push(['title', esc(node.title, true)]);
                }
                out(tag('a', attrs));
            } else {
                out(tag('/a'));
            }
            break;

        case 'Image':
            if (entering) {
                if (disableTags === 0) {
                    out('<img src="' + esc(node.destination, true) +
                        '" alt="');
                }
                disableTags += 1;
            } else {
                disableTags -= 1;
                if (disableTags === 0) {
                    if (node.title) {
                        out('" title="' + esc(node.title, true));
                    }
                    out('" />');
                }
            }
            break;

        case 'Code':
            out(tag('code') + esc(node.literal) + tag('/code'));
            break;

        case 'Document':
            break;

        case 'Paragraph':
            grandparent = node.parent.parent;
            if (grandparent !== null &&
                grandparent.t === 'List') {
                if (grandparent.list_data.tight) {
                    break;
                }
            }
            if (entering) {
                cr();
                out(tag('p', attrs));
            } else {
                out(tag('/p'));
                cr();
            }
            break;

        case 'BlockQuote':
            if (entering) {
                cr();
                out(tag('blockquote', attrs));
                cr();
            } else {
                cr();
                out(tag('/blockquote'));
                cr();
            }
            break;

        case 'Item':
            if (entering) {
                out(tag('li', attrs));
            } else {
                out(tag('/li'));
                cr();
            }
            break;

        case 'List':
            tagname = node.list_data.type === 'Bullet' ? 'ul' : 'ol';
            if (entering) {
                if (node.list_data.start && node.list_data.start > 1) {
                    attrs.push(['start', node.list_data.start.toString()]);
                }
                cr();
                out(tag(tagname, attrs));
                cr();
            } else {
                cr();
                out(tag('/' + tagname));
                cr();
            }
            break;

        case 'Header':
            tagname = 'h' + node.level;
            if (entering) {
                cr();
                out(tag(tagname, attrs));
            } else {
                out(tag('/' + tagname));
                cr();
            }
            break;

        case 'CodeBlock':
            info_words = node.info ? node.info.split(/ +/) : [];
            if (info_words.length > 0 && info_words[0].length > 0) {
                attrs.push(['class', 'language-' + esc(info_words[0], true)]);
            }
            cr();
            out(tag('pre') + tag('code', attrs));
            out(esc(node.literal));
            out(tag('/code') + tag('/pre'));
            cr();
            break;

        case 'HtmlBlock':
            cr();
            out(node.literal);
            cr();
            break;

        case 'HorizontalRule':
            cr();
            out(tag('hr', attrs, true));
            cr();
            break;


        case 'ReferenceDef':
            break;

        default:
            throw("Unknown node type " + node.t);
        }

    }
    if (options.time) { console.timeEnd("rendering"); }
    return buffer;
};

var replaceUnsafeChar = function(s) {
    switch (s) {
    case '&':
        return '&amp;';
    case '<':
        return '&lt;';
    case '>':
        return '&gt;';
    case '"':
        return '&quot;';
    default:
        return s;
    }
};

// The HtmlRenderer object.
function HtmlRenderer(options){
    return {
        // default options:
        softbreak: '\n', // by default, soft breaks are rendered as newlines in HTML
        // set to "<br />" to make them hard breaks
        // set to " " if you want to ignore line wrapping in source
        escape: escapeXml,
        options: options || {},
        render: renderNodes
    };
}

module.exports = HtmlRenderer;
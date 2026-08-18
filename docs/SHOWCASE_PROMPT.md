# Visual Showcase Prompt

Paste the following into a new disposable DSH session after installing the plugin:

```markdown
Run a hands-off DSH conversation-accent showcase. Do not ask for confirmation.

1. Create and update a task checklist so a successful generic Tool call is visible.
2. In a unique temporary directory under the current workspace, use Write, Read, Edit, Grep, Glob, and successful Bash calls.
3. Perform one clearly labeled, intentional failing Bash command and continue; do not modify existing files.
4. Clean up only the temporary directory you created.
5. Finish with a rich Markdown sample containing:
   - H1 through H4 headings;
   - plain text mixed with **strong**, *emphasis*, ~~deleted text~~, [a safe link](https://spec.commonmark.org/), and `inline code`;
   - nested blockquotes;
   - ordered, unordered, and task lists;
   - a table with emphasized headings;
   - JavaScript, Python, Bash, JSON, and diff fenced code blocks;
   - code comments, keywords, strings, functions, constants, parameters, and punctuation;
   - a long inline path to check wrapping;
   - a final tool-result table listing every successful and intentional failed call.

Keep the final answer to roughly two or three screens. The temporary files are only test fixtures and must be removed before the final answer.
```

While it runs, observe that running Think text is gold but plain, and running tool indicators remain native. After completion, compare the same output with the master switch on/off and in light/dark mode.

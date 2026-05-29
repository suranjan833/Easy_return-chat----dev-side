with open('src/layout/sidebar/GroupChatPopup.jsx', 'r') as f:
    content = f.read()

# 1. Fix duplicate message-dropdown-menu - remove the inner one added by Python script
# Current: <div className="message-dropdown-menu">\n                                <div className="message-dropdown-menu">\n                                <button
# Desired: <div className="message-dropdown-menu">\n                                <button

old_dup = '''                              <div className="message-dropdown-menu">
                                <div className="message-dropdown-menu">
                                <button'''
new_clean = '''                              <div className="message-dropdown-menu">
                                <button'''

if old_dup in content:
    content = content.replace(old_dup, new_clean, 1)
    print("SUCCESS: Fixed duplicate div")
else:
    print("WARNING: Could not find duplicate div pattern")

# 2. Move reply button outside the {isMe && (...)} block
# Current structure:
#   {isMe && (
#     <>
#       <div className="message-dropdown-wrapper">...</div>
#       <button className="message-reply-btn">...</button>
#     </>
#   )}
#   <button className="message-forward-btn">...</button>
#
# Desired structure:
#   {isMe && (
#     <>
#       <div className="message-dropdown-wrapper">...</div>
#     </>
#   )}
#   <button className="message-reply-btn">...</button>
#   <button className="message-forward-btn">...</button>

# Find: the closing </> of isMe block followed by reply button and then </> )
old_isMe_block = '''                        </>
                      )}
                      <button
                        className="message-forward-btn"'''

new_isMe_block = '''                        </>
                      )}
                      <button
                        className="message-reply-btn"
                        onClick={() => handleReply(item)}
                      >
                        <i className="bi bi-reply"></i>
                      </button>
                      <button
                        className="message-forward-btn"'''

if old_isMe_block in content:
    content = content.replace(old_isMe_block, new_isMe_block, 1)
    print("SUCCESS: Moved reply button outside isMe block")
else:
    print("WARNING: Could not find the isMe block closing pattern")

with open('src/layout/sidebar/GroupChatPopup.jsx', 'w') as f:
    f.write(content)

print("DONE")

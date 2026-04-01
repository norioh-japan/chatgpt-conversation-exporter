let extractedData = [];

document.getElementById('extractBtn').addEventListener('click', extractData);

document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
              document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
              document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
              e.target.classList.add('active');
              const tabId = e.target.getAttribute('data-tab');
              document.getElementById(tabId + '-tab').classList.add('active');
      });
});

document.getElementById('copyTableBtn').addEventListener('click', () => {
      const table = document.getElementById('dataTable');
      const range = document.createRange();
      range.selectNodeContents(table);
      window.getSelection().addRange(range);
      document.execCommand('copy');
      showStatus('✓ テーブルをコピーしました');
});

document.getElementById('copyCsvBtn').addEventListener('click', () => {
      const text = document.getElementById('csvText').value;
      navigator.clipboard.writeText(text).then(() => {
              showStatus('✓ CSVをコピーしました');
      });
});

document.getElementById('copyJsonBtn').addEventListener('click', () => {
      const text = document.getElementById('jsonText').value;
      navigator.clipboard.writeText(text).then(() => {
              showStatus('✓ JSONをコピーしました');
      });
});

document.getElementById('downloadCsvBtn').addEventListener('click', () => {
      const csv = document.getElementById('csvText').value;
      downloadFile(csv, 'chatgpt-conversations.csv', 'text/csv');
});

document.getElementById('downloadJsonBtn').addEventListener('click', () => {
      const json = document.getElementById('jsonText').value;
      downloadFile(json, 'chatgpt-conversations.json', 'application/json');
});

async function extractData() {
      const status = document.getElementById('status');
      status.textContent = '処理中...';
      try {
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
              const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        function: extractDataFromPage
              });
              extractedData = (results && results[0] && results[0].result) ? results[0].result : [];
              if (extractedData.length === 0) {
                        status.textContent = 'データが見つかりませんでした';
                        return;
              }
              displayTable();
              const csv = generateCSV(extractedData);
              document.getElementById('csvText').value = csv;
              const json = JSON.stringify(extractedData, null, 2);
              document.getElementById('jsonText').value = json;
              status.textContent = `✓ ${extractedData.length}件のデータを抽出しました`;
      } catch (error) {
              console.error('Error:', error);
              status.textContent = 'エラー: ' + error.message;
      }
}

function extractDataFromPage() {
      const data = [];
      const projectNameEl = document.querySelector('h1, [class*="project"], [class*="Project"]');
      const projectName = projectNameEl ? projectNameEl.textContent.trim() : '不明';

  document.querySelectorAll('a[href*="/c/"]').forEach(link => {
          const href = link.getAttribute('href');
          if (!href || !href.includes('/c/')) return;

                                                          const chatTitle = link.textContent.trim() || 'Untitled';
          const fullUrl = new URL(href, window.location.origin).href;
          const chatUrl = fullUrl;
          const shareUrl = fullUrl.split('?')[0];

                                                          data.push({
                                                                    project: projectName,
                                                                    title: chatTitle,
                                                                    chat_url: chatUrl,
                                                                    share_url: shareUrl,
                                                                    exported_at: new Date().toISOString()
                                                          });
  });

  const uniqueData = [];
      const seen = new Set();
      data.forEach(item => {
              if (!seen.has(item.share_url)) {
                        seen.add(item.share_url);
                        uniqueData.push(item);
              }
      });
      return uniqueData;
}

function displayTable() {
      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = extractedData.map(item => `
          <tr>
                <td>${escapeHtml(item.project)}</td>
                      <td><strong>${escapeHtml(item.title)}</strong></td>
                            <td><a href="${item.chat_url}" target="_blank" style="color: #667eea; text-decoration: none; word-break: break-all;">link</a></td>
                                  <td><a href="${item.share_url}" target="_blank" style="color: #667eea; text-decoration: none; word-break: break-all;">link</a></td>
                                        <td>${new Date(item.exported_at).toLocaleString('ja-JP')}</td>
                                            </tr>
                                              `).join('');
}

function generateCSV(data) {
      const headers = ['project', 'title', 'chat_url', 'share_url', 'exported_at'];
      const rows = data.map(item => [
              `"${item.project.replace(/"/g, '""')}"`,
              `"${item.title.replace(/"/g, '""')}"`,
              `"${item.chat_url}"`,
              `"${item.share_url}"`,
              `"${item.exported_at}"`
            ].join(','));
      return [headers.join(','), ...rows].join('\n');
}

function downloadFile(content, filename, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
}

function escapeHtml(text) {
      const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'};
      return text.replace(/[&<>"']/g, m => map[m]);
}

function showStatus(message) {
      const status = document.getElementById('status');
      status.textContent = message;
      setTimeout(() => {
              status.textContent = '';
      }, 2000);
}

window.addEventListener('load', () => {
      document.getElementById('extractBtn').click();
});
